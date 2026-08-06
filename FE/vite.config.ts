import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // 개발 중에도 SW·Push 구독을 시험할 수 있도록 활성화
      devOptions: {
        enabled: true,
      },
      workbox: {
        // 자동 생성 SW에 Web Push 핸들러를 합칩니다.
        importScripts: ['push-sw.js'],
      },
      includeAssets: ['icon-192.png', 'icon-512.png', 'push-sw.js'],
      manifest: {
        name: '바비오더',
        short_name: '바비오더',
        description: '바비든든 주문·관리',
        display: 'standalone',
        // 단일 PWA 매니페스트 — 실제 분기는 / 에서 마지막 사용 모드(유저/관리자)로 처리
        start_url: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
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
