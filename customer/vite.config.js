import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // 保留旧版手机浏览器可识别的媒体查询，避免移动布局被忽略。
    cssTarget: ['chrome87', 'safari14'],
  },
  test: {
    environment: 'happy-dom',
  },
  server: {
    host: true, // 监听局域网，手机扫码演示时需要（否则仅 127.0.0.1 可访问）
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
