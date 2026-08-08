import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker'

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "src/**/*.{ts,tsx}"',
      },
      // Overlay steals pointer events and blocks login / manual UAT on `npm run dev` (UX-01).
      // Terminal diagnostics stay on. Opt in: VITE_CHECKER_OVERLAY=true
      overlay: process.env.VITE_CHECKER_OVERLAY === 'true',
    }),
  ],
  ssr: {
    noExternal: ['@tanstack/react-query', 'react-router-dom'],
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          calendar: [
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction',
          ],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
          state: ['zustand'],
          ui: ['sonner', 'clsx', 'tailwind-merge'],
          offline: ['dexie'],
        },
      },
    },
  },
})
