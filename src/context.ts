import { createContext, useContext } from 'react'
import type { SockasContextValue } from './types'

export const SockasContext = createContext<SockasContextValue | null>(null)

export function useSockasContext(): SockasContextValue {
  const ctx = useContext(SockasContext)
  if (!ctx) {
    throw new Error(
      '[react-sockas] useSockasContext must be used inside <SockasProvider>',
    )
  }
  return ctx
}
