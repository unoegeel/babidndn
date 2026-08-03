import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 개발 중에는 /api 요청을 운영 백엔드로 프록시합니다.
    // (백엔드 CORS 화이트리스트에 없는 포트에서도 개발할 수 있도록)
    proxy: {
      '/api': {
        target: 'https://babidndn.shop',
        changeOrigin: true,
        configure: (proxy) => {
          // 브라우저가 붙인 Origin 헤더가 그대로 전달되면 백엔드 CORS 필터가
          // 화이트리스트에 없는 포트를 403 으로 거부하므로 제거하고 전달합니다.
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
    },
  },
})
