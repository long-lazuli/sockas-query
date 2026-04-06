import * as React from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { SockasProvider } from '../SockasProvider'
import { useSockAsQuery } from '../useSockAsQuery'
import { mockSocket, mockSubscribeFactory } from './utils'
import type { MockSocket } from './utils'

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const socket = mockSocket()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SockasProvider
          sockets={{ chat: socket }}
          subscribe={{ chat: mockSubscribeFactory('message') }}
        >
          {children}
        </SockasProvider>
      </QueryClientProvider>
    )
  }

  return { queryClient, socket, Wrapper }
}

describe('useSockAsQuery', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with isListening false, true after mount effect', async () => {
    const { socket, Wrapper } = setup()
    const states: Array<boolean> = []

    function Page() {
      const { isListening } = useSockAsQuery({
        subscriptionKey: ['chat', 'room', '1'],
      })
      states.push(isListening)
      return null
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    expect(states[states.length - 1]).toBe(true)
    expect(socket.on).toHaveBeenCalledTimes(1)
  })

  it('writes received message to TQ cache (default: replace)', async () => {
    const { socket, Wrapper } = setup()

    function Page() {
      const { data } = useSockAsQuery<
        MockSocket,
        { text: string },
        { text: string }
      >({
        subscriptionKey: ['chat', 'room', '1'],
      })
      return <div data-testid="out">{data?.text ?? 'none'}</div>
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => {
      socket.push('message', { text: 'hello' })
    })
    expect(screen.getByTestId('out').textContent).toBe('hello')

    act(() => {
      socket.push('message', { text: 'world' })
    })
    expect(screen.getByTestId('out').textContent).toBe('world')
  })

  it('applies custom onReception reducer', async () => {
    const { socket, Wrapper } = setup()

    function Page() {
      const { data } = useSockAsQuery<MockSocket, Array<string>, string>({
        subscriptionKey: ['chat', 'messages'],
        onReception: (prev = [], msg) => [...prev, msg],
      })
      return <div data-testid="out">{JSON.stringify(data ?? [])}</div>
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => {
      socket.push('message', 'a')
    })
    act(() => {
      socket.push('message', 'b')
    })
    expect(screen.getByTestId('out').textContent).toBe('["a","b"]')
  })

  it('unsubscribes on unmount', async () => {
    const { socket, Wrapper } = setup()

    function Page() {
      useSockAsQuery({ subscriptionKey: ['chat', 'room', '1'] })
      return null
    }

    const { unmount } = render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    expect(socket.on).toHaveBeenCalledTimes(1)
    unmount()
    expect(socket.off).toHaveBeenCalledTimes(1)
  })

  it('shares cache key with useQuery — socket write visible to useQuery', async () => {
    const { socket, Wrapper } = setup()

    function Page() {
      const socketResult = useSockAsQuery<
        MockSocket,
        { name: string },
        { name: string }
      >({
        subscriptionKey: ['chat', 'user', '42'],
      })
      const queryResult = useQuery({
        queryKey: ['chat', 'user', '42'],
        queryFn: () => Promise.resolve({ name: 'from-fetch' }),
        enabled: false,
      })
      return (
        <div>
          <span data-testid="sock">{socketResult.data?.name ?? 'none'}</span>
          <span data-testid="query">{queryResult.data?.name ?? 'none'}</span>
        </div>
      )
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => {
      socket.push('message', { name: 'Alice' })
    })

    expect(screen.getByTestId('sock').textContent).toBe('Alice')
    expect(screen.getByTestId('query').textContent).toBe('Alice')
  })

  it('respects enabled: false — does not subscribe', async () => {
    const { socket, Wrapper } = setup()

    function Page() {
      useSockAsQuery({ subscriptionKey: ['chat', 'room', '1'], enabled: false })
      return null
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})
    expect(socket.on).not.toHaveBeenCalled()
  })

  it('uses per-hook subscribe override when provided', async () => {
    const { socket, Wrapper } = setup()
    const customOn = vi.fn()
    const customOff = vi.fn()

    function Page() {
      useSockAsQuery({
        subscriptionKey: ['chat', 'custom'],
        subscribe: (s, emit) => {
          customOn(s, emit)
          return () => customOff()
        },
      })
      return null
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})
    expect(customOn).toHaveBeenCalledWith(socket, expect.any(Function))
    expect(socket.on).not.toHaveBeenCalled()
  })
})
