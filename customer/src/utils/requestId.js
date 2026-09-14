// getRandomValues 也可用于本地局域网 HTTP 访问；不依赖仅安全上下文提供的 randomUUID。
export function createRequestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
