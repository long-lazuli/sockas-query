---
id: cache-interop
title: Cache Interoperability
---

## Overview

`useSockAsQuery` stores socket data directly in the TanStack Query cache using `subscriptionKey` as the cache key. This means socket-driven data and query-fetched data can share the same cache and react to each other.

## How Socket Keys and Query Keys Share Cache

The `subscriptionKey` you pass to `useSockAsQuery` is used directly as a TanStack Query `queryKey`. When a socket message arrives, `useSockAsQuery` calls `queryClient.setQueryData(subscriptionKey, ...)` — updating the cache entry at that key. Any `useQuery` with the same key will automatically re-render with the new data.

```tsx
// Socket subscription writes to ['users', 'profile']
useSockAsQuery({ subscriptionKey: ['users', 'profile'] })

// useQuery reads from the same cache entry
const { data } = useQuery({
  queryKey: ['users', 'profile'],
  queryFn: fetchProfile,
})
```

> **Convention:** The first segment of `subscriptionKey` must match a socket name registered in `SockasProvider`. Use a second segment (e.g. `'profile'`, `'events'`) to scope the cache entry.

## Invalidating from `onReception`

Use `onReception` to trigger a cache invalidation when a socket event arrives. This is useful when the socket event signals that data has changed, but you want a fresh fetch — not to use the event payload as the data itself.

```tsx
function UserPage() {
  const qc = useQueryClient()

  useSockAsQuery({
    subscriptionKey: ['users', 'events'],
    onReception: (_prev, _msg) => {
      // Invalidate the user query so useQuery refetches
      qc.invalidateQueries({ queryKey: ['users', '1'] })
      return _msg
    },
  })

  const { data } = useQuery({
    queryKey: ['users', '1'],
    queryFn: () => fetchUser('1'),
  })

  return <div>{data?.name}</div>
}
```

The `subscriptionKey` for the socket subscription (`['users', 'events']`) is separate from the query key being invalidated (`['users', '1']`). They share the `'users'` namespace prefix but target different cache entries.

## Invalidating from `useSockAsMutation.onSuccess`

After a mutation, invalidate related queries so they refetch with fresh data:

```tsx
function UpdateProfile() {
  const queryClient = useQueryClient()

  const { send } = useSockAsMutation({
    socketName: 'users',
    emit: (socket, vars) => {
      socket.emit('update-profile', vars)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return <button onClick={() => send({ name: 'Alice' })}>Update</button>
}
```

This pattern keeps optimistic updates simple: send the mutation, and let the query refetch the source of truth.

## Multiple Sockets and Independent Namespaces

Each socket registered in `SockasProvider` uses its name as the first segment of all related cache keys. Different sockets write to separate cache namespaces and do not interfere with each other.

```tsx
<SockasProvider
  sockets={{ chat: chatSocket, users: usersSocket }}
  subscribe={{
    chat: chatSubscribeFactory,
    users: usersSubscribeFactory,
  }}
>
  {children}
</SockasProvider>
```

```tsx
// Writes to ['chat', 'room'] — isolated from users
const chat = useSockAsQuery({ subscriptionKey: ['chat', 'room'] })

// Writes to ['users', 'list'] — isolated from chat
const users = useSockAsQuery({ subscriptionKey: ['users', 'list'] })
```

A push on `chatSocket` only updates entries under the `'chat'` namespace. A push on `usersSocket` only updates entries under `'users'`. There is no cross-contamination between namespaces.
