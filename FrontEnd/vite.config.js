import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/food-items': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/voice': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/update-quantity': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/login': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/signup': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/logout': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/orders': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/create-order': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/verify-payment': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/user-orders': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/update-order-status': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/session-cart': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    }
  }
})

