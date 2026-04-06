---
id: useSockAsMutation
title: useSockAsMutation
---

```tsx
const { send, isPending, data, error } = useSockAsMutation({
  socketName,
  emit,
  onSuccess,
  onError,
  onSettled,
})
```

## Options

- `socketName: string`
  - Required. The key of the socket in the `SockasProvider` `sockets` map to emit on.

- `mutationKey?: ReadonlyArray<unknown>`
  - Optional. Reserved for future use (e.g., devtools identification). Currently unused at runtime.

- `emit: (socket: TSocket, variables: TVariables) => Promise<TData> | void`
  - Required. Called with the socket instance and the variables passed to `send()`.
  - **Fire-and-forget:** Return `void` (or `undefined`). `isPending` stays `false`; `onSuccess` is called immediately with `data = undefined`.
  - **Ack pattern:** Return a `Promise<TData>`. `isPending` is `true` until the Promise resolves or rejects. On resolve, `data` is set and `onSuccess` is called with the resolved value. On reject, `onError` is called.

- `onSuccess?: (data: TData | undefined, variables: TVariables) => void`
  - Called after a successful emit. For fire-and-forget, `data` is `undefined`. For ack, `data` is the resolved value.

- `onError?: (error: Error, variables: TVariables) => void`
  - Called when `emit` throws synchronously or when the returned Promise rejects.

- `onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void`
  - Called after every `send()`, regardless of success or failure. Useful for invalidating queries or resetting UI state unconditionally.

## Returns

- `send: (variables: TVariables) => void`
  - Call this to trigger the mutation. Passes the socket and variables to `emit`.

- `isPending: boolean`
  - `true` only when an ack Promise is in flight. Always `false` for fire-and-forget.

- `data: TData | undefined`
  - The resolved value from the last successful ack emit. `undefined` for fire-and-forget or before the first successful send.

- `error: Error | null`
  - The error from the last failed emit. `null` when no error has occurred or after a successful send.
