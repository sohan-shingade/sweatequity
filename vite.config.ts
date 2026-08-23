import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    // Dev: forward API + photos to the local backend (server/index.mjs).
    proxy: {
      '/api': 'http://localhost:8790',
      '/photos': 'http://localhost:8790',
    },
  },
});
