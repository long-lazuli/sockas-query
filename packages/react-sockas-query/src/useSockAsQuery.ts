import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSockasContext } from './context'
import type { UseSockAsQueryOptions, UseSockAsQueryResult } from './types'

export function useSockAsQuery<
  TSocket = unknown,
  TData = unknown,
  TMessage = unknown,
>(
  options: UseSockAsQueryOptions<TSocket, TData, TMessage>,
): UseSockAsQueryResult<TData> {
  const {
    subscriptionKey,
    onReception,
    subscribe: hookSubscribe,
    enabled = true,
    initialData,
    select,
  } = options

  const { sockets, subscribe: factories } = useSockasContext()
  const queryClient = useQueryClient()

  const [isListening, setIsListening] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (!enabled) return

    const socketName = subscriptionKey[0] as string
    const socket = sockets[socketName] as TSocket

    if (socket == null) {
      setError(
        new Error(
          `[react-sockas] No socket registered for name "${socketName}"`,
        ),
      )
      return
    }

    const emit = (message: TMessage) => {
      queryClient.setQueryData<TData>(subscriptionKey, (prev) => {
        if (onReception) return onReception(prev, message)
        return message as unknown as TData
      })
    }

    let cleanup: () => void

    try {
      if (hookSubscribe) {
        cleanup = hookSubscribe(socket, emit)
      } else {
        const factory = factories[socketName] as
          | (typeof factories)[string]
          | undefined
        if (factory == null) {
          throw new Error(
            `[react-sockas] No subscribe factory for socket "${socketName}"`,
          )
        }
        cleanup = factory(socket, subscriptionKey, emit as never)
      }
      setIsListening(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      return
    }

    return () => {
      cleanup()
      setIsListening(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-subscribe on socket name or enabled change
  }, [enabled, subscriptionKey[0]])

  // Subscribe to the TQ cache so the component re-renders when setQueryData is called.
  // useSyncExternalStore ensures concurrent-safe subscriptions to external stores.
  const queryCache = queryClient.getQueryCache()
  const rawData = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => {
        return queryCache.subscribe((event) => {
          if (
            event.type === 'updated' &&
            event.query.queryHash ===
              queryClient.defaultQueryOptions({ queryKey: subscriptionKey })
                .queryHash
          ) {
            onStoreChange()
          }
        })
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- subscriptionKey identity managed by caller
      [queryCache, queryClient, subscriptionKey[0]],
    ),
    () => queryClient.getQueryData<TData>(subscriptionKey) ?? initialData,
    () => queryClient.getQueryData<TData>(subscriptionKey) ?? initialData,
  )

  const data = select
    ? rawData !== undefined
      ? select(rawData)
      : undefined
    : rawData

  const status = error ? 'error' : isListening ? 'listening' : 'idle'

  return { data, isListening, error, status }
}
