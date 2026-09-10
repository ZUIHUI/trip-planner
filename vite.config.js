import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageMetadata = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

const readGitValue = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: new URL('.', import.meta.url),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
};

const appVersion = process.env.VITE_APP_VERSION || packageMetadata.version;
const appBuildNumber = process.env.VITE_APP_BUILD_NUMBER
  || process.env.BUILD_NUMBER
  || readGitValue(['rev-list', '--count', 'HEAD']);
const appCommitSha = (
  process.env.VITE_APP_COMMIT_SHA
  || process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || readGitValue(['rev-parse', '--short=7', 'HEAD'])
).slice(0, 7);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_APP_BUILD_NUMBER': JSON.stringify(appBuildNumber),
    'import.meta.env.VITE_APP_COMMIT_SHA': JSON.stringify(appCommitSha)
  },
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
