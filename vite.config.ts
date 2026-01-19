import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Using root path for Cloudflare Pages deployment
    const base = '/';

    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['childrenlearn.activing.fun'],
        hmr: {
          protocol: 'wss',
          host: 'childrenlearn.activing.fun',
          clientPort: 443,
        },
      },
      plugins: [
        react()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
