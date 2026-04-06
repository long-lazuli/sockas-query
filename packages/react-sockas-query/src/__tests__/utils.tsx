import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { QueryClient } from '@tanstack/react-query'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import type { SubscribeFactory } from '../types'

/** Mirror of TQ's queryKey() test helper — returns a unique key per test */
let keyCount = 0
export function queryKey(): ReadonlyArray<string> {
  return [`key-${++keyCount}`]
}

/** Creates a mock socket with on/off/emit spies */
export function mockSocket() {
  const listeners: Map<string, Array<(msg: unknown) => void>> = new Map()
  return {
    on: vi.fn((event: string, handler: (msg: unknown) => void) => {
      const existing = listeners.get(event)
      if (existing) {
        existing.push(handler)
      } else {
        listeners.set(event, [handler])
      }
    }),
    off: vi.fn((event: string, handler: (msg: unknown) => void) => {
      const existing = listeners.get(event)
      if (existing) {
        listeners.set(
          event,
          existing.filter((h) => h !== handler),
        )
      }
    }),
    /** Simulate server pushing a message */
    push: (event: string, message: unknown) => {
      listeners.get(event)?.forEach((h) => h(message))
    },
  }
}

export type MockSocket = ReturnType<typeof mockSocket>

/** Creates a simple subscribe factory for a mock socket */
export function mockSubscribeFactory(
  eventName: string,
): SubscribeFactory<MockSocket> {
  return (socket, _key, emit) => {
    socket.on(eventName, emit)
    return () => socket.off(eventName, emit)
  }
}

/** Renders with QueryClientProvider */
export function renderWithClient(
  ui: React.ReactElement,
  client: QueryClient,
  options?: RenderOptions,
): RenderResult {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
