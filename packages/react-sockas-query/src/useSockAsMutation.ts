import * as React from 'react'
import { useSockasContext } from './context'
import type { UseSockAsMutationOptions, UseSockAsMutationResult } from './types'

export function useSockAsMutation<
  TSocket = unknown,
  TVariables = unknown,
  TData = unknown,
>(
  options: UseSockAsMutationOptions<TSocket, TVariables, TData>,
): UseSockAsMutationResult<TVariables, TData> {
  const { socketName, emit, onSuccess, onError, onSettled } = options
  const { sockets } = useSockasContext()

  const [isPending, setIsPending] = React.useState(false)
  const [data, setData] = React.useState<TData | undefined>(undefined)
  const [error, setError] = React.useState<Error | null>(null)

  const send = React.useCallback(
    (variables: TVariables) => {
      const socket = sockets[socketName] as TSocket

      let result: Promise<TData> | void

      try {
        result = emit(socket, variables) as Promise<TData> | void
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        setError(err)
        onError?.(err, variables)
        onSettled?.(undefined, err, variables)
        return
      }

      if (result instanceof Promise) {
        setIsPending(true)
        result
          .then((resolved) => {
            setData(resolved)
            setIsPending(false)
            setError(null)
            onSuccess?.(resolved, variables)
            onSettled?.(resolved, null, variables)
          })
          .catch((e: unknown) => {
            const err = e instanceof Error ? e : new Error(String(e))
            setIsPending(false)
            setError(err)
            onError?.(err, variables)
            onSettled?.(undefined, err, variables)
          })
      } else {
        onSuccess?.(undefined, variables)
        onSettled?.(undefined, null, variables)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socketName, emit, onSuccess, onError, onSettled, sockets],
  )

  return { send, isPending, data, error }
}
