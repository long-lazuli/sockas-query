import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SockasContext } from './context'
import type { SockasProviderProps, SocketsMap } from './types'

export function SockasProvider<TSockets extends SocketsMap>({
  sockets,
  subscribe,
  children,
}: SockasProviderProps<TSockets>) {
  const queryClient = useQueryClient()

  // Dev-mode: warn if a socket name collides with an existing query key namespace.
  // Intentionally runs once on mount — collision check is for initial wiring only.
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const existingKeys = queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey[0])
        .filter(Boolean)

      for (const socketName of Object.keys(sockets)) {
        if (existingKeys.includes(socketName)) {
          console.warn(
            `[react-sockas] Socket "${socketName}" shares key namespace with existing queries. ` +
              `If intentional, this enables live cache updates from socket events.`,
          )
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once on mount

  const value = React.useMemo(
    () => ({ sockets, subscribe }),
    [sockets, subscribe],
  )

  return (
    <SockasContext.Provider value={value as never}>
      {children}
    </SockasContext.Provider>
  )
}
