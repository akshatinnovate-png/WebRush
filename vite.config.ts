import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend-only build. Everything ships as static files, so the output of
// `npm run build` can be dropped straight onto any static host.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Keep React in its own long-cached chunk; app code changes far more often.
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
});
