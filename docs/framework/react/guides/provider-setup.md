---
id: provider-setup
title: Provider Setup
---

## Setting up SockasProvider

`SockasProvider` sits inside `QueryClientProvider` and provides socket instances to the entire component tree.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SockasProvider } from '@sockas-query/react'
import { io } from 'socket.io-client'

const queryClient = new QueryClient()
const socket = io('wss://api.example.com')

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SockasProvider
        sockets={{ api: socket }}
        subscribe={{
          api: (socket, key, emit) => {
            const event = key.slice(1).join(':')
            socket.on(event, emit)
            return () => socket.off(event, emit)
          },
        }}
      >
        <YourApp />
      </SockasProvider>
    </QueryClientProvider>
  )
}
```

## Multiple sockets

Register multiple sockets by name. Each name becomes the first segment of all related cache keys.

```tsx
<SockasProvider
  sockets={{
    users: io('wss://users.example.com'),
    chat:  io('wss://chat.example.com'),
  }}
  subscribe={{
    users: (socket, key, emit) => { /* ... */ },
    chat:  (socket, key, emit) => { /* ... */ },
  }}
>
```

## Key namespace sharing

If a socket name matches a first key segment used by `useQuery`, they share the same TanStack Query cache entry. This is intentional — socket pushes can keep REST query data fresh with no manual invalidation:

```tsx
// Both read/write ['users', id] in the same TQ cache slot
useQuery({ queryKey: ['users', id], queryFn: fetchUser })
useSockAsQuery({ subscriptionKey: ['users', id] /* ... */ })
```

A dev-mode warning is logged when this overlap is detected, so you can confirm it is intentional.
