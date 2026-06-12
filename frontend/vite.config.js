import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        tailwindcss(fileURLToPath(new URL('./tailwind.config.js', import.meta.url))),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@common': fileURLToPath(new URL('../common', import.meta.url))
    },
  },
  build: {
    sourcemap: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./src/test-setup.js']
  },
})
