import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 18762,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:18760',
        changeOrigin: true,
      },
    },
  },
})
