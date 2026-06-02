import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (!normalizedId.includes('/node_modules/')) {
            return undefined;
          }

          if (normalizedId.includes('/react-dom/') || normalizedId.includes('/react/') || normalizedId.includes('/scheduler/')) {
            return 'react-vendor';
          }

          if (normalizedId.includes('/react-router-dom/') || normalizedId.includes('/react-router/') || normalizedId.includes('/@remix-run/router/')) {
            return 'router-vendor';
          }

          if (normalizedId.includes('/firebase/auth/') || normalizedId.includes('/@firebase/auth/')) {
            return 'firebase-auth';
          }

          if (normalizedId.includes('/firebase/firestore/') || normalizedId.includes('/@firebase/firestore/') || normalizedId.includes('/@firebase/webchannel-wrapper/')) {
            return 'firebase-firestore';
          }

          if (normalizedId.includes('/firebase/database/') || normalizedId.includes('/@firebase/database/')) {
            return 'firebase-database';
          }

          if (normalizedId.includes('/firebase/functions/') || normalizedId.includes('/@firebase/functions/')) {
            return 'firebase-functions';
          }

          if (
            normalizedId.includes('/firebase/app/')
            || normalizedId.includes('/@firebase/app/')
            || normalizedId.includes('/@firebase/component/')
            || normalizedId.includes('/@firebase/logger/')
            || normalizedId.includes('/@firebase/util/')
          ) {
            return 'firebase-core';
          }

          if (normalizedId.includes('/lucide-react/')) {
            return 'icons-vendor';
          }

          return undefined;
        }
      }
    }
  },
  server: {
    host: '0.0.0.0', // 確保在容器環境中可以被外部訪問
    port: 5173,
  }
});
