// This file is kept for backward compatibility with tests and tooling.
// The actual client entry point is now src/entry-client.tsx (uses hydrateRoot for SSR).
// src/entry-server.tsx provides the server-side render function.
//
// For development without SSR: npm run dev (uses Vite SPA mode with entry-client.tsx)
// For development with SSR:    npm run dev:ssr (uses Express + Vite middleware)
// For production SSR build:    npm run build:ssr && npm start

