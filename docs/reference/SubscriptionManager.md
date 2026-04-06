---
id: SubscriptionManager
title: SubscriptionManager
---

```ts
const manager = new SubscriptionManager({
  key,
  socketName,
  socket,
  factory,
  onReception,
  onData,
  onError,
})

manager.subscribe()
manager.unsubscribe()
```

`SubscriptionManager` is a framework-agnostic class that manages the lifecycle of a single socket subscription. It lives in `@sockas-query/core` and has no React dependencies.

It is used internally by `useSockAsQuery` (in `@sockas-query/react`), but can be used directly in any environment that manages its own state lifecycle.

## Constructor Options

- `key: ReadonlyArray<unknown>`
  - The subscription key identifying this subscription. Passed to `factory` so the factory can use it for scoping.

- `socketName: string`
  - The logical name of the socket. Typically the first segment of `key`. Informational — used for identification purposes.

- `socket: TSocket`
  - The socket instance to subscribe on. Type is generic (`TSocket`), allowing any transport implementation.

- `factory: SubscribeFactory<TSocket, TMessage>`
  - A function called during `subscribe()` that wires the socket event to the `emit` callback. Must return a cleanup function called during `unsubscribe()`.
  - Signature: `(socket: TSocket, key: ReadonlyArray<unknown>, emit: (message: TMessage) => void) => () => void`

- `onReception: OnReception<TData, TMessage>`
  - A reducer called on each incoming message. Receives `prev` (always `undefined` in the current implementation — callers manage state externally) and `message`, and returns the next `TData` value.
  - Signature: `(prev: TData | undefined, message: TMessage) => TData`
  - If this function throws, `onError` is called instead of `onData`.

- `onData: (data: TData) => void`
  - Called with the result of `onReception` after each successful message. This is where the caller integrates with its state system (e.g., calling `queryClient.setQueryData` in `useSockAsQuery`).

- `onError: (error: Error) => void`
  - Called when `onReception` throws or when `factory` itself throws during `subscribe()`.

## Methods

### `subscribe(): void`

Calls `factory` with the socket, key, and an internal `emit` function. The `emit` function calls `onReception` and then `onData` (or `onError` on throw). The cleanup returned by `factory` is stored and called by `unsubscribe()`.

If `factory` throws, `onError` is called and no cleanup is registered.

### `unsubscribe(): void`

Calls the cleanup function returned by `factory` and clears it. Safe to call multiple times — subsequent calls are no-ops.

## Note on `prev` in `onReception`

The `SubscriptionManager` always passes `undefined` as `prev` to `onReception`. State accumulation across messages (e.g., appending to an array) is the responsibility of the caller. In `useSockAsQuery`, this is handled by passing `queryClient.getQueryData(key)` as `prev` before calling the user's reducer. If you use `SubscriptionManager` directly, manage `prev` in your `onData` callback.

## Types

```ts
type AnySocket = unknown

type SubscribeFactory<TSocket = AnySocket, TMessage = unknown> = (
  socket: TSocket,
  key: ReadonlyArray<unknown>,
  emit: (message: TMessage) => void,
) => () => void

type OnReception<TData = unknown, TMessage = unknown> = (
  prev: TData | undefined,
  message: TMessage,
) => TData

interface SubscriptionManagerOptions<TData, TMessage, TSocket = AnySocket> {
  key: ReadonlyArray<unknown>
  socketName: string
  socket: TSocket
  factory: SubscribeFactory<TSocket, TMessage>
  onReception: OnReception<TData, TMessage>
  onData: (data: TData) => void
  onError: (error: Error) => void
}
```
