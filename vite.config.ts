import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // <-- ¡Añade esta importación!

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'vue': 'vue/dist/vue.esm-bundler.js',
      '@': path.resolve(__dirname, './src'), // <-- ¡Añade esta línea para el alias @!
      // Si tenías '@modules' comentado o eliminado, déjalo así
      // '@modules': fileURLToPath(new URL('./node_modules', import.meta.url)) // <-- Esto puede eliminarse si no lo usas
    }
  },
  css: {
    //
  }
})