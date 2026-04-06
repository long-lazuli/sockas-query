---
id: subscriptions
title: Subscriptions
---

## Subscription Basics

A subscription is a declarative dependency on a real-time socket event. It is tied to a **unique key** — the same key system used by `useQuery`.

```tsx
import { useSockAsQuery } from '@sockas/react-query'

function UserStatus({ userId }: { userId: string }) {
  const { data, isListening } = useSockAsQuery({
    subscriptionKey: ['users', userId],
  })

  if (!isListening) return <span>Connecting...</span>
  return <span>{data?.status ?? 'unknown'}</span>
}
```

The first segment of `subscriptionKey` must be a socket name registered in `SockasProvider`. The rest of the key identifies the specific data within that socket's namespace.

## Data Model — Replace vs Reduce

By default, each incoming message **replaces** the previous cache value. This mirrors how `useQuery` overwrites data on each fetch.

```tsx
// default: replace (latest value wins)
useSockAsQuery({ subscriptionKey: ['users', id] })

// custom reducer: append to array
useSockAsQuery({
  subscriptionKey: ['chat', 'messages'],
  onReception: (prev = [], msg) => [...prev, msg],
})
```

## Sharing a Cache Key with useQuery

When a socket name matches the first key segment of a `useQuery`, they share the same TanStack Query cache entry. Socket pushes update the data that `useQuery` reads — no manual `invalidateQueries` needed.

```tsx
// Both read/write ['users', id] in the same TQ cache slot
useQuery({ queryKey: ['users', id], queryFn: fetchUser })
useSockAsQuery({ subscriptionKey: ['users', id] })
```

## Side Effects on Reception

Access `queryClient` via `useQueryClient()` before the hook call and close over it in `onReception`:

```tsx
const queryClient = useQueryClient()

useSockAsQuery({
  subscriptionKey: ['users', 'events'],
  onReception: (prev, msg) => {
    queryClient.invalidateQueries({ queryKey: ['users', msg.userId] })
    return msg
  },
})
```

## Conditional Subscriptions

Use `enabled` to conditionally subscribe, identical to `useQuery`:

```tsx
useSockAsQuery({
  subscriptionKey: ['chat', roomId],
  enabled: isLoggedIn,
})
```
