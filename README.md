# sockas-query

> Real-time socket subscriptions as first-class citizens of [TanStack Query](https://tanstack.com/query).

`@sockas-query/react` lets you use WebSocket events with the same ease as `useQuery` and `useMutation` — sharing the same cache, the same keys, the same invalidation system. One store. No second state layer.

## Packages

| Package                                                | Description                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| [`@sockas-query/react`](./packages/react-sockas-query) | React hooks: `useSockAsQuery`, `useSockAsMutation`, `SockasProvider` |
| [`@sockas-query/core`](./packages/sockas-query-core)   | Framework-agnostic core: `SubscriptionManager`                       |

## Quick example

```tsx
// Wrap your app — socket name 'users' owns all ['users', ...] cache keys
<SockasProvider
  sockets={{ users: mySocket }}
  subscribe={{
    users: (socket, key, emit) => {
      socket.on(key.slice(1).join(':'), emit)
      return () => socket.off(key.slice(1).join(':'), emit)
    },
  }}
>

// Listen — data lives in TanStack Query cache
const { data, isListening } = useSockAsQuery({
  subscriptionKey: ['users', userId],
  onReception: (prev, msg) => ({ ...prev, ...msg }),
})

// Send — mirrors useMutation
const { send } = useSockAsMutation({
  socketName: 'users',
  emit: (socket, vars) => socket.emit('update-user', vars),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
})
```

## Key concepts

- **One cache** — socket data and query data share TanStack Query's `QueryClient`. No second store.
- **Shared keys** — name your socket `users` and `useSockAsQuery({ subscriptionKey: ['users', id] })` writes into the same cache slot as `useQuery({ queryKey: ['users', id] })`.
- **Transport-agnostic** — works with Socket.io, native WebSocket, SSE, or any event-based API.
- **TDD, strictly typed** — 24 tests, TypeScript strict mode + `exactOptionalPropertyTypes`.

## Documentation

- [Provider Setup](./docs/framework/react/guides/provider-setup.md)
- [Subscriptions guide](./docs/framework/react/guides/subscriptions.md)
- [Mutations guide](./docs/framework/react/guides/mutations.md)
- [Cache interop guide](./docs/framework/react/guides/cache-interop.md)
- [`SockasProvider` reference](./docs/framework/react/reference/SockasProvider.md)
- [`useSockAsQuery` reference](./docs/framework/react/reference/useSockAsQuery.md)
- [`useSockAsMutation` reference](./docs/framework/react/reference/useSockAsMutation.md)
- [`SubscriptionManager` reference](./docs/reference/SubscriptionManager.md)

## Running the example

A real-time chat demo shows all three patterns working together.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in two browser windows.

See [examples/react/README.md](./examples/react/README.md) for details.

## Design

Mirrors TanStack Query's own architecture:

| TanStack Query        | sockas-query          |
| --------------------- | --------------------- |
| `QueryClientProvider` | `SockasProvider`      |
| `useQuery`            | `useSockAsQuery`      |
| `useMutation`         | `useSockAsMutation`   |
| `query-core`          | `@sockas-query/core`  |
| `react-query`         | `@sockas-query/react` |

The library uses TanStack Query's public API only — `setQueryData`, `invalidateQueries`, `getQueryData`. No internals.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

The TanStack Query source is available as a git submodule at `externals/tanstack-query` — used as living documentation, never modified.
