import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
      ],
      dts: 'src/auto-imports.d.ts',
      eslintrc: {
        enabled: false,
      },
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
        }),
      ],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          'primary-color': '#1677ff',
        },
        javascriptEnabled: true,
      },
    },
  },
  server: {
    port: Number(process.env.PORT || 3000),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || '18760'}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@ant-design/icons-vue')) {
              return 'ant-design-icons'
            }
            if (id.includes('ant-design-vue')) {
              return 'ant-design-vue'
            }
            if (id.includes('echarts') || id.includes('zrender')) {
              return 'echarts'
            }
            return 'vendor'
          }
        }
      }
    }
  },
})
