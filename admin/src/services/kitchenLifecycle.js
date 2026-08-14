export function createKitchenLifecycle(timer = globalThis) {
  let reconnectTimer = null
  let heartbeatTimer = null
  let pollingTimer = null

  return {
    start(tick, loadOrders) {
      heartbeatTimer = timer.setInterval(tick, 1000)
      pollingTimer = timer.setInterval(loadOrders, 30000)
    },
    scheduleReconnect(reconnect) {
      timer.clearTimeout(reconnectTimer)
      reconnectTimer = timer.setTimeout(reconnect, 3000)
    },
    dispose(ws) {
      timer.clearTimeout(reconnectTimer)
      timer.clearInterval(heartbeatTimer)
      timer.clearInterval(pollingTimer)
      ws?.close()
    },
  }
}
