/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Unit tests exercise RBAC/UI without MFA friction; E2E sets this at build time too
  define: {
    'import.meta.env.VITE_DISABLE_MFA': JSON.stringify('true'),
    'import.meta.env.VITE_ALLOW_DEMO_AUTH': JSON.stringify('true'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
