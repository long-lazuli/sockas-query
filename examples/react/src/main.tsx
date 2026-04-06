import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div>
        <h1>react-sockas example</h1>
        <p>Coming soon.</p>
      </div>
    </QueryClientProvider>
  </StrictMode>,
)
