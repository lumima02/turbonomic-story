import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' lets the built site run from any folder or GitHub Pages path.
export default defineConfig({
  plugins: [react()],
  base: './',
  css: { preprocessorOptions: { scss: { api: 'modern-compiler', quietDeps: true, silenceDeprecations: ['legacy-js-api', 'import'] } } }
});
