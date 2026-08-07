import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { I18nProvider } from './i18n'
import App from './App'

export function render(url: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: false },
      mutations: { retry: false },
    },
  })

  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <StaticRouter location={url}>
        <I18nProvider>
          <App />
        </I18nProvider>
      </StaticRouter>
    </QueryClientProvider>,
  )

  return { html }
}
