import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',         // explicit — matches Cloudflare Pages build output setting
    emptyOutDir: true,
    sourcemap: false,       // smaller bundle in production
    rollupOptions: {
      output: {
        // Cache-friendly code splitting: vendor chunk stays cached across deploys
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit'],
        },
      },
    },
  },
})
