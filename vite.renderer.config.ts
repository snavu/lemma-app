import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  root: './src/renderer',
  plugins: [
    react({
      jsxRuntime: 'automatic',
    })
  ],
  base: '',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  }
});
