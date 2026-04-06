---
id: useSockAsQuery
title: useSockAsQuery
---

```tsx
const { data, isListening, error, status } = useSockAsQuery({
  subscriptionKey,
  onReception,
  subscribe,
  enabled,
  initialData,
  select,
})
```

## Options

- `subscriptionKey: ReadonlyArray<unknown>`
  - Required. First segment must be a socket name registered in `SockasProvider`.
  - Doubles as the TanStack Query cache key — socket data and `useQuery` data on the same key share the same cache entry.

- `onReception: (prev: TData | undefined, message: TMessage) => TData`
  - Optional. Reducer applied to each incoming message.
  - Default: replace — `(_, msg) => msg` (latest value wins).
  - Use a closure over `useQueryClient()` for side effects like `invalidateQueries`.

- `subscribe: (socket: TSocket, emit: (msg: TMessage) => void) => () => void`
  - Optional. Per-hook override for the subscription factory.
  - Use when the global `SockasProvider` factory does not fit this specific subscription.
  - Returns a cleanup (unsubscribe) function.

- `enabled: boolean`
  - Optional. Default: `true`. Set to `false` to skip subscribing.

- `initialData: TData`
  - Optional. Value used before the first message arrives.

- `select: (data: TData) => TData`
  - Optional. Transform data before it is returned.

## Returns

- `data: TData | undefined`
  - The current cached value. Sourced from `queryClient.getQueryData(subscriptionKey)`.
  - Reactive — updates on every socket push and on external `setQueryData` calls.

- `isListening: boolean`
  - `true` once the subscription is active (after mount effect runs).

- `error: Error | null`
  - Set if subscription setup fails or no socket is registered for the key's name.

- `status: 'listening' | 'idle' | 'error'`
  - `'idle'` before mount, `'listening'` once active, `'error'` on failure.
