import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: true,
    },
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },

    // 生产环境优化：移除 console 语句
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,  // 移除所有 console.* 语句
          drop_debugger: true, // 移除 debugger 语句
        },
      },
    },
  };
});
