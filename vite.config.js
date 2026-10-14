import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'block-model-renderer': path.resolve(__dirname, 'node_modules/block-model-renderer/dist/block-model-renderer.min.js')
    },
    dedupe: ['three']
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/convert': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/total-downloads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/stats': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/view': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/download': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/online': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
