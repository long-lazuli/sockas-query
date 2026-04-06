# react-sockas — Design Spec

**Date:** 2026-04-06  
**Status:** Draft

---

## Overview

`react-sockas` is a React library that makes WebSocket subscriptions first-class citizens of TanStack Query's cache system. It provides two hooks — `useSockAsQuery` and `useSockAsMutation` — that mirror the `useQuery` / `useMutation` API, storing all socket state directly in the TanStack Query `QueryClient` cache. There is **one store**: the TanStack Query cache.

The library is fully **transport-agnostic**: it works with Socket.io, native WebSocket, SSE, or any event-based socket API.

---

## Goals

- Socket subscriptions share the TanStack Query cache — no second store
- `useSockAsQuery` and `useSockAsMutation` are as easy to use as `useQuery` and `useMutation`
- Socket cache keys and query cache keys are unified — `invalidateQueries`, `setQueryData`, etc. work across both
- Strictly typed throughout
- No modifications to TanStack Query internals — only public API (`setQueryData`, `invalidateQueries`, `getQueryData`)

## Non-Goals (deferred)

- Usage without a TanStack Query provider
- SSR / server-side socket handling

---

## Repository Setup

TanStack Query source is included as a **git submodule** pointing to `https://github.com/tanstack/query`. The purpose is:
- Source as living documentation (AI agents and contributors stay current with the actual API)
- Easier bug report reproduction against the exact upstream version
- All tests run inside a real `QueryClientProvider`

### Integration-readiness

`react-sockas` is structured so it could be dropped into TanStack Query's monorepo as a `packages/` entry with minimal friction:
- Same toolchain: pnpm, tsup, vitest, changesets
- Same script names: `test:lib`, `test:types`, `test:eslint`, `build`
- Same test style: vitest + @testing-library/react, real `QueryClientProvider` in every test
- Public API only: no TanStack Query internals are used or modified

If the TanStack team wants to adopt it, the barrier is as low as possible.

---

## Architecture

```
<QueryClientProvider client={queryClient}>        ← TanStack Query (unchanged)
  <SockasProvider sockets={...} subscribe={...}>  ← react-sockas
    <App />
  </SockasProvider>
</QueryClientProvider>
```

`SockasProvider` reads `queryClient` from TanStack Query's own context. It does not re-provide it.

---

## Key Namespace Convention

**Socket names are mandatory** and always form the **first segment of every cache key**.

```ts
sockets={{ users: io('wss://...'), chat: io('wss://...') }}

// Cache key for a socket subscription:
subscriptionKey: ['users', userId]
// Cache key for a regular query on the same entity:
queryKey: ['users', userId]
```

Because socket names are the first key segment, a socket named `users` writes into the exact same TanStack Query cache slot as `useQuery({ queryKey: ['users', userId] })`. This is **intentional**: a socket push can keep a REST query's cache fresh with no manual invalidation.

### Dev-mode collision warning

In development, `SockasProvider` inspects the `QueryClient`'s query cache on mount. If a socket name matches a first key segment already used by registered queries, a warning is logged:

```
[react-sockas] Socket "users" shares key namespace with existing queries.
If intentional, this enables live cache updates from socket events.
```

This is informational — not an error. The user decides whether the overlap is deliberate.

---

## `SockasProvider`

```tsx
<SockasProvider
  sockets={{
    users: io('wss://users.example.com'),
    chat:  io('wss://chat.example.com'),
  }}
  subscribe={{
    users: (socket, key, emit) => {
      const event = key.slice(1).join(':')   // ['users', '42'] → '42'
      socket.on(event, emit)
      return () => socket.off(event, emit)
    },
    chat: (socket, key, emit) => { ... },
  }}
>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `sockets` | `Record<string, Socket>` | Named socket instances. Keys become the first cache key segment. |
| `subscribe` | `Record<string, SubscribeFactory>` | Per-socket subscription factory. |

### `SubscribeFactory`

```ts
type SubscribeFactory = (
  socket: Socket,
  key: readonly unknown[],
  emit: (message: unknown) => void
) => () => void  // returns unsubscribe cleanup
```

The factory is called when a `useSockAsQuery` hook mounts. It wires the socket event to `emit`. It returns a cleanup function called on unmount.

Per-hook `subscribe` override is supported — useful when a single subscription doesn't fit the global factory pattern.

---

## `useSockAsQuery`

```ts
const { data, isListening, error, status } = useSockAsQuery({
  subscriptionKey: ['users', userId],   // first segment = socket name
  onReception: (prev, msg) => msg,  // default: replace
  subscribe: (socket, emit) => { ... }, // optional per-hook override
  enabled: true,
  initialData: undefined,
  select: (data) => data,               // standard TQ select
})
```

### Behaviour

1. **Mount**: calls `subscribeFactory(socket, subscriptionKey, emit)` → stores cleanup
2. **`emit(msg)`**: calls `queryClient.setQueryData(subscriptionKey, onReception(prev, msg, queryClient))`
3. **`isListening`**: `true` once the subscription is active
4. **Unmount**: calls cleanup (unsubscribes)
5. **`data`**: sourced from `queryClient.getQueryData(subscriptionKey)` — reactive, same as `useQuery`

### `onReception`

```ts
type OnReception<TData, TMessage> = (
  prev: TData | undefined,
  message: TMessage
) => TData
```

- Default: `(_, msg) => msg` (replace — latest value wins)
- Can return a transformed value (reducer pattern)
- `queryClient` is available via `useQueryClient()` in the component body before the hook call — close over it for side effects like `invalidateQueries`

### Return shape

| Field | Type | Description |
|-------|------|-------------|
| `data` | `TData \| undefined` | Current cached value |
| `isListening` | `boolean` | Subscription is active |
| `error` | `Error \| null` | Connection or handler error |
| `status` | `'listening' \| 'idle' \| 'error'` | Subscription status |

---

## `useSockAsMutation`

```ts
const { send, isPending, data, error } = useSockAsMutation({
  mutationKey: ['users', 'update'],       // optional, for devtools
  socketName: 'users',                    // which socket to emit on
  emit: (socket, variables) => {
    socket.emit('user:update', variables)
    // return a Promise for ack support, or void for fire-and-forget
  },
  onSuccess: (data, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
  onError: (error, variables, context) => { ... },
  onSettled: (data, error, variables, context) => { ... },
})

send({ name: 'Alice' })
```

### Ack support

If `emit` returns a `Promise`, `isPending` stays `true` until it resolves. `data` is set to the resolved value. If it rejects, `error` is set. Fire-and-forget if `emit` returns `void`.

### Return shape

| Field | Type | Description |
|-------|------|-------------|
| `send` | `(variables: TVariables) => void` | Trigger the emission |
| `isPending` | `boolean` | Emission in flight (ack) or just sent |
| `data` | `TData \| undefined` | Ack response data, if any |
| `error` | `Error \| null` | Emission or ack error |

---

## Cache Interoperability

Because socket data lives in TanStack Query's cache:

```ts
// Socket push updates cache for ['users', id]
useSockAsQuery({ subscriptionKey: ['users', id], ... })

// useQuery on same key reads the same cache entry
useQuery({ queryKey: ['users', id], queryFn: fetchUser })

// useSockAsMutation can invalidate any key
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })

// onReception can invalidate related keys as a side effect
// In component body:
const queryClient = useQueryClient()

onReception: (prev, msg) => {
  queryClient.invalidateQueries({ queryKey: ['chat'] })
  return msg
}
```

All standard TanStack Query cache operations work as-is.

---

## TypeScript

The library is strictly typed. Key types:

```ts
// Socket name is a keyof the sockets map provided to SockasProvider
useSockAsQuery<
  TSocketName extends keyof Sockets,
  TData,
  TMessage
>({ subscriptionKey: [TSocketName, ...unknown[]], ... })

// onReception is typed against TData and TMessage
onReception: (prev: TData | undefined, msg: TMessage, qc: QueryClient) => TData
```

Provider-level `sockets` and `subscribe` maps must have matching keys — enforced at the type level.

---

## Testing

- All tests run inside a real `QueryClientProvider` + `SockasProvider`
- TanStack Query source is available as a submodule for reference and reproduction
- Tests cover: subscription lifecycle, cache writes, reducer behaviour, ack flow, invalidation side effects, dev-mode collision warning
