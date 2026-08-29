<template>
  <main id="main-content" class="entry-page" tabindex="-1" aria-labelledby="entry-title">
    <div class="entry-orb orb-one" aria-hidden="true" />
    <div class="entry-orb orb-two" aria-hidden="true" />

    <section class="entry-card card">
      <div class="brand-lockup">
        <div class="entry-logo" aria-hidden="true">🍜</div>
        <div>
          <p class="brand-name" translate="no">有味餐厅</p>
          <p class="brand-slogan">每一桌，都值得认真对待</p>
        </div>
      </div>

      <div class="entry-copy">
        <p class="eyebrow">WELCOME · 欢迎光临</p>
        <h1 id="entry-title">扫码入座，即刻开吃</h1>
        <p>请扫描桌台上的二维码，系统会自动识别桌号并带你进入点餐页面。</p>
      </div>

      <ol class="entry-steps" aria-label="扫码点餐步骤">
        <li><span>01</span>扫描桌台二维码</li>
        <li><span>02</span>登录并选择菜品</li>
        <li><span>03</span>提交后查看进度</li>
      </ol>

      <div class="scan-hint">
        <span class="scan-icon" aria-hidden="true">⌗</span>
        <div>
          <strong>请对准桌台二维码</strong>
          <span>每张餐桌都有独立的点餐入口</span>
        </div>
      </div>

      <router-link class="account-link" to="/login">已有账号？登录查看订单</router-link>
      <p class="entry-note">登录后可以查看订单；开始点餐仍需先关联桌台。</p>
    </section>
  </main>
</template>

<style scoped>
.entry-page {
  position: relative;
  display: grid;
  min-height: 100dvh;
  overflow: hidden;
  padding: calc(28px + env(safe-area-inset-top)) 20px calc(28px + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 12% 8%, rgb(229 77 46 / 15%), transparent 18rem),
    radial-gradient(circle at 92% 90%, rgb(196 122 34 / 10%), transparent 18rem), var(--bg-page);
  place-items: center;
}

.entry-orb {
  position: absolute;
  border: 1px solid rgb(229 77 46 / 10%);
  border-radius: 50%;
  pointer-events: none;
}

.orb-one {
  top: -80px;
  right: -70px;
  width: 230px;
  height: 230px;
}

.orb-two {
  bottom: -95px;
  left: -80px;
  width: 260px;
  height: 260px;
}

.entry-card {
  position: relative;
  z-index: 1;
  width: min(100%, 480px);
  padding: 30px 26px;
  border-radius: var(--radius-xl);
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
}

.entry-logo {
  display: grid;
  width: 50px;
  height: 50px;
  border: 1px solid rgb(229 77 46 / 15%);
  border-radius: var(--radius-lg);
  background: var(--brand-light);
  font-size: 26px;
  place-items: center;
}

.brand-name {
  color: var(--text-main);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 2px;
}

.brand-slogan {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 11px;
}

.entry-copy {
  margin-top: 34px;
}

.eyebrow {
  color: var(--brand-dark);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
}

h1 {
  max-width: 8em;
  margin-top: 10px;
  color: var(--text-main);
  font-size: clamp(30px, 9vw, 40px);
  line-height: 1.2;
  letter-spacing: -1px;
  text-wrap: balance;
}

.entry-copy > p:last-child {
  margin-top: 14px;
  color: var(--text-sub);
  font-size: 14px;
  line-height: 1.75;
  text-wrap: pretty;
}

.entry-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 28px;
  list-style: none;
}

.entry-steps li {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: #fbf8f5;
  color: var(--text-sub);
  font-size: 11px;
  line-height: 1.4;
}

.entry-steps span {
  color: var(--brand-dark);
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.scan-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 14px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--brand-light), #fff8f2);
}

.scan-icon {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--surface-strong);
  color: var(--brand-dark);
  font-size: 28px;
  place-items: center;
}

.scan-hint div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.scan-hint strong {
  font-size: 14px;
}

.scan-hint div span {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 11px;
}

.account-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tap-target-min);
  margin-top: 18px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  color: var(--brand-dark);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.entry-note {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 360px) {
  .entry-card {
    padding-inline: 20px;
  }

  .entry-steps {
    grid-template-columns: 1fr;
  }

  .entry-steps li {
    flex-direction: row;
    align-items: center;
  }
}
</style>
