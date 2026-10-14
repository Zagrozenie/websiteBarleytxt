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
    allowedHosts: [
      'barleytxt.pl',
      '.barleytxt.pl'
    ]
  },
  preview: {
    port: 5173,
    allowedHosts: [
      'barleytxt.pl',
      '.barleytxt.pl'
    ]
  }
});
