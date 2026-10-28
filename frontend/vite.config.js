import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { main: resolve(process.cwd(), 'index.html'), 'firebase-messaging-sw': resolve(process.cwd(), 'src/push-sw.js') }, output: { entryFileNames: chunk => chunk.name === 'firebase-messaging-sw' ? 'firebase-messaging-sw.js' : 'assets/[name]-[hash].js' } } },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
});
