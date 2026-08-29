# Nginx deployment

This deployment serves both Vue applications from one HTTPS origin:

- `https://example.com/` — customer application
- `https://example.com/admin/` — employee application
- `https://example.com/api/...` — Spring Boot HTTP API, with `/api` removed upstream
- `wss://example.com/ws/...` — Spring Boot WebSocket endpoint, with `/ws/...` preserved

The checked-in configuration is a template, not evidence of a live deployment. A real host, certificate, DNS record, firewall, and running backend are still required.

## 1. Build and stage the static files

Use a new, empty release directory as the web root. The admin base is passed explicitly so this procedure does not depend on a local package-script customization.

```bash
cd /path/to/restaurant-frontend
npm --prefix customer ci
npm --prefix customer run build
npm --prefix admin ci
npm --prefix admin run build -- --base=/admin/

install -d /srv/restaurant-web/releases/RELEASE_ID/admin
cp -a customer/dist/. /srv/restaurant-web/releases/RELEASE_ID/
cp -a admin/dist/. /srv/restaurant-web/releases/RELEASE_ID/admin/
```

The resulting layout must be:

```text
WEB_ROOT/
├── index.html          # customer build
├── assets/             # customer assets
└── admin/
    ├── index.html      # admin build
    └── assets/         # admin assets
```

Keep the release directory immutable after staging. Point `__WEB_ROOT__` at that exact absolute directory (or at an atomically switched `current` symlink).

## 2. Replace every deployment value

Copy [`nginx/restaurant.conf.template`](nginx/restaurant.conf.template) to the Nginx `http {}` include directory, normally `/etc/nginx/conf.d/restaurant.conf`, and replace every item below. No other template tokens are expected.

| Placeholder | Replace with | Example only |
| --- | --- | --- |
| `__DOMAIN__` | Public DNS name used by customers and employees; DNS must resolve to this server | `restaurant.example.com` |
| `__WEB_ROOT__` | Absolute path to the staged layout above, without a trailing slash | `/srv/restaurant-web/current` |
| `__BACKEND_HOST__` | Host or IP that Nginx can use to reach Spring Boot | `127.0.0.1` |
| `__BACKEND_PORT__` | Spring Boot HTTP/WebSocket port | `8080` |
| `__TLS_CERTIFICATE_PATH__` | Absolute path to the PEM certificate/full chain readable by Nginx | `/etc/letsencrypt/live/restaurant.example.com/fullchain.pem` |
| `__TLS_PRIVATE_KEY_PATH__` | Absolute path to the matching PEM private key readable by Nginx | `/etc/letsencrypt/live/restaurant.example.com/privkey.pem` |

Do not leave example values or `__...__` tokens in the enabled file. If the backend has a servlet context path, listens through another proxy, or exposes a WebSocket path other than `/ws/kitchen`, adjust both proxy rules deliberately and rerun the invariant validator.

## 3. Validate before reload

The repository validator checks the template's static routing invariants, verifies that production WebSockets select `wss` on HTTPS and use the current host, and can reproduce both production builds:

```bash
node scripts/validate-deployment.mjs --build
```

On the deployment host, validate the fully substituted Nginx configuration and only then reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` cannot validate the unexpanded template. Check the deployed behavior after DNS/TLS are live:

```bash
curl -I https://restaurant.example.com/
curl -I https://restaurant.example.com/admin/
curl -i https://restaurant.example.com/api/categories
```

Finally sign in as a chef at `/admin/` and confirm the kitchen screen establishes a `wss://restaurant.example.com/ws/kitchen?...` connection in browser developer tools. This live WSS check requires the real certificate and backend and therefore is not covered by local static validation.

## Routing details

The Nginx `root` points at the combined staging layout, so `try_files` resolves `/admin/...` under `WEB_ROOT/admin/...` without the common `alias`/SPA-fallback ambiguity. The trailing slash in the API `proxy_pass` replaces `/api/` with `/`; the absence of a URI suffix in the WebSocket `proxy_pass` preserves the complete `/ws/...` path. Port 80 only redirects to HTTPS, making the production same-origin WebSocket scheme `wss`.
