---
id: SockasProvider
title: SockasProvider
---

```tsx
<SockasProvider
  sockets={{
    [socketName]: socketInstance,
  }}
  subscribe={{
    [socketName]: (socket, key, emit) => {
      // wire socket event to cache
      return () => {
        /* cleanup */
      }
    },
  }}
>
  {children}
</SockasProvider>
```

## Options

- `sockets: Record<string, Socket>`
  - Required. Named socket instances. Keys become the first segment of all related cache keys.
  - Each key is a "socket name" — used as `subscriptionKey[0]` in `useSockAsQuery`.

- `subscribe: Record<string, SubscribeFactory>`
  - Required. Must have the same keys as `sockets`.
  - Each factory is called when a `useSockAsQuery` hook mounts for that socket name.
  - Signature: `(socket, key, emit) => unsubscribeFn`
    - `socket` — the socket instance for this name
    - `key` — the full `subscriptionKey` including socket name as first segment
    - `emit` — call this with each incoming message to write it to the TanStack Query cache
    - Returns a cleanup function called on unmount

- `children: React.ReactNode`
  - Required.

## Dev-mode collision warning

In development (`NODE_ENV !== 'production'`), `SockasProvider` inspects the `QueryClient` cache on mount. If a socket name matches a first key segment already used by registered queries, it logs:

```
[react-sockas] Socket "users" shares key namespace with existing queries.
If intentional, this enables live cache updates from socket events.
```

This is informational — not an error. When intentional, it means socket pushes write directly into the same cache slot as `useQuery({ queryKey: ['users', ...] })`.

## Notes

- Must be rendered inside `<QueryClientProvider>` — it reads `queryClient` from TanStack Query's context.
- Uses the TanStack Query `queryClient` directly — no second store.
