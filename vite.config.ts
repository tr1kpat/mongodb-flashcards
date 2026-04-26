/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app under /<repo>/ — set base accordingly for prod.
// Override via VITE_BASE_PATH env var when needed (e.g. custom domain).
const basePath = process.env.VITE_BASE_PATH ?? '/mongodb-flashcards/';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? basePath : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
}));
