import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SockasProvider } from '@sockas/react-query'
import { socket } from './socket'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SockasProvider
        sockets={{ chat: socket }}
        subscribe={{
          // Global factory: key ['chat', ...rest] → listens to rest.join(':') event
          // e.g. ['chat', 'general', 'message-sent'] → listens to 'general:message-sent'
          chat: (sock, key, emit) => {
            const event = (key as string[]).slice(1).join(':')
            sock.on(event, emit)
            return () => sock.off(event, emit)
          },
        }}
      >
        <App />
      </SockasProvider>
    </QueryClientProvider>
  </StrictMode>,
)
