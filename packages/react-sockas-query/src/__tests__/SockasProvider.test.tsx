import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { SockasProvider } from '../SockasProvider'
import { useSockasContext } from '../context'
import { mockSocket, mockSubscribeFactory } from './utils'

describe('SockasProvider', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    queryClient.clear()
  })

  it('provides socket context to children', () => {
    const socket = mockSocket()
    let capturedCtx: ReturnType<typeof useSockasContext> | null = null

    function Consumer() {
      capturedCtx = useSockasContext()
      return <div>ok</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <SockasProvider
          sockets={{ chat: socket }}
          subscribe={{ chat: mockSubscribeFactory('msg') }}
        >
          <Consumer />
        </SockasProvider>
      </QueryClientProvider>,
    )

    expect(capturedCtx).not.toBeNull()
    expect(capturedCtx!.sockets.chat).toBe(socket)
  })

  it('throws when useSockasContext is used outside provider', () => {
    function Consumer() {
      useSockasContext()
      return null
    }
    expect(() =>
      render(
        <QueryClientProvider client={queryClient}>
          <Consumer />
        </QueryClientProvider>,
      ),
    ).toThrow(
      '[react-sockas] useSockasContext must be used inside <SockasProvider>',
    )
  })

  it('warns in dev when socket name collides with existing query key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const socket = mockSocket()

    queryClient.setQueryData(['users', '1'], { id: 1 })

    render(
      <QueryClientProvider client={queryClient}>
        <SockasProvider
          sockets={{ users: socket }}
          subscribe={{ users: mockSubscribeFactory('update') }}
        >
          <div />
        </SockasProvider>
      </QueryClientProvider>,
    )

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[react-sockas] Socket "users" shares key namespace',
      ),
    )
    warnSpy.mockRestore()
  })
})
