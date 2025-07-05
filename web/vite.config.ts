import { defineConfig } from 'vite'

export default defineConfig({
  // Set base path for GitHub Pages deployment
  base: process.env.NODE_ENV === 'production' ? '/iina-remote/' : '/',
  
  server: {
    host: '0.0.0.0', // Allow external connections for remote access
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
}) 