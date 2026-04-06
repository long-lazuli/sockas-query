---
id: mutations
title: Mutations
---

## Overview

`useSockAsMutation` lets you emit events over a socket in a declarative, React-friendly way. It mirrors the intent of TanStack Query's `useMutation` — you call `send()` instead of `mutate()`, and the hook manages pending state, data, and error for you.

## Basic Usage

```tsx
import { useSockAsMutation } from '@sockas/react-query'

function SendButton() {
  const { send, isPending } = useSockAsMutation({
    socketName: 'chat',
    emit: (socket, message) => {
      socket.emit('send-message', message)
    },
  })

  return (
    <button disabled={isPending} onClick={() => send({ text: 'Hello!' })}>
      Send
    </button>
  )
}
```

The first argument to `emit` is the socket instance registered under `socketName` in `SockasProvider`. The second is whatever you pass to `send()`.

## Fire-and-Forget vs Ack

### Fire-and-Forget

Return `void` from `emit`. The mutation completes synchronously — `isPending` never becomes `true`, and `onSuccess` is called immediately with `data = undefined`.

```tsx
useSockAsMutation({
  socketName: 'chat',
  emit: (socket, vars) => {
    socket.emit('message', vars) // no return
  },
  onSuccess: () => console.log('sent'),
})
```

### Ack Pattern

Return a `Promise` from `emit`. `isPending` is `true` until the Promise settles. On resolve, `data` holds the resolved value and `onSuccess` is called with it.

```tsx
useSockAsMutation({
  socketName: 'orders',
  emit: (socket, order) =>
    new Promise((resolve, reject) => {
      socket.emit('place-order', order, (ack: { id: string } | null) => {
        if (ack) resolve(ack)
        else reject(new Error('No acknowledgment'))
      })
    }),
  onSuccess: (ack) => console.log('Order placed:', ack?.id),
})
```

## Invalidating Cache in onSuccess

A common pattern is to invalidate a TanStack Query cache entry after a successful mutation, so the UI refetches fresh data:

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { useSockAsMutation } from '@sockas/react-query'

function UpdateProfile() {
  const queryClient = useQueryClient()

  const { send } = useSockAsMutation({
    socketName: 'users',
    emit: (socket, vars) => {
      socket.emit('update-profile', vars)
    },
    onSuccess: () => {
      // Refetch any queries that start with ['users']
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return <button onClick={() => send({ name: 'Alice' })}>Update</button>
}
```

## Error Handling

`onError` is called with the `Error` and the variables that were passed to `send()`, whether the error is thrown synchronously or from a rejected Promise.

```tsx
useSockAsMutation({
  socketName: 'chat',
  emit: () => {
    throw new Error('disconnected')
  },
  onError: (err, vars) => console.error('Failed to send', vars, err),
})
```

`onSettled` is called after every send, regardless of outcome — useful for resetting loading indicators or form state:

```tsx
useSockAsMutation({
  socketName: 'chat',
  emit: (socket, vars) => socket.emit('msg', vars),
  onSettled: () => setFormDirty(false),
})
```
