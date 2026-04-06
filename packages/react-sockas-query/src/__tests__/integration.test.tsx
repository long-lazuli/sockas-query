import * as React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { SockasProvider } from '../SockasProvider'
import { useSockAsQuery } from '../useSockAsQuery'
import { useSockAsMutation } from '../useSockAsMutation'
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
          sockets={{ users: socket }}
          subscribe={{ users: mockSubscribeFactory('update') }}
        >
          {children}
        </SockasProvider>
      </QueryClientProvider>
    )
  }

  return { queryClient, socket, Wrapper }
}

describe('integration', () => {
  afterEach(() => vi.useRealTimers())

  it('socket push invalidates a useQuery on the same key namespace', async () => {
    const { socket, Wrapper } = setup()
    let fetchCount = 0

    function Page() {
      const qc = useQueryClient()
      const { data } = useQuery({
        queryKey: ['users', '1'],
        queryFn: () => {
          fetchCount++
          return Promise.resolve({ name: `fetch-${fetchCount}` })
        },
      })
      useSockAsQuery({
        subscriptionKey: ['users', 'events'],
        onReception: (prev, msg) => {
          qc.invalidateQueries({ queryKey: ['users', '1'] })
          return msg
        },
      })
      return <div data-testid="name">{data?.name ?? 'loading'}</div>
    }

    render(<Page />, { wrapper: Wrapper })
    await waitFor(() =>
      expect(screen.getByTestId('name').textContent).toBe('fetch-1'),
    )

    act(() => {
      socket.push('update', { event: 'user-changed' })
    })
    await waitFor(() =>
      expect(screen.getByTestId('name').textContent).toBe('fetch-2'),
    )
    expect(fetchCount).toBe(2)
  })

  it('useSockAsMutation send triggers useSockAsQuery cache update', async () => {
    const { socket, Wrapper } = setup()

    function Page() {
      const { data } = useSockAsQuery<
        MockSocket,
        { name: string },
        { name: string }
      >({
        subscriptionKey: ['users', 'profile'],
      })
      const { send } = useSockAsMutation<
        MockSocket,
        Record<string, never>,
        void
      >({
        socketName: 'users',
        emit: (s) => {
          ;(s as MockSocket).push('update', { name: 'Updated' })
        },
      })
      return (
        <div>
          <span data-testid="name">{data?.name ?? 'none'}</span>
          <button onClick={() => send({})}>update</button>
        </div>
      )
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => {
      screen.getByRole('button').click()
    })
    await waitFor(() =>
      expect(screen.getByTestId('name').textContent).toBe('Updated'),
    )
  })

  it('multiple sockets maintain independent cache namespaces', async () => {
    const chatSocket = mockSocket()
    const usersSocket = mockSocket()
    const queryClient = new QueryClient()

    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <SockasProvider
            sockets={{ chat: chatSocket, users: usersSocket }}
            subscribe={{
              chat: mockSubscribeFactory('msg'),
              users: mockSubscribeFactory('update'),
            }}
          >
            {children}
          </SockasProvider>
        </QueryClientProvider>
      )
    }

    function Page() {
      const chat = useSockAsQuery<unknown, string, string>({
        subscriptionKey: ['chat', 'room'],
      })
      const users = useSockAsQuery<unknown, string, string>({
        subscriptionKey: ['users', 'list'],
      })
      return (
        <div>
          <span data-testid="chat">{chat.data ?? 'none'}</span>
          <span data-testid="users">{users.data ?? 'none'}</span>
        </div>
      )
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => {
      chatSocket.push('msg', 'hello-chat')
    })
    act(() => {
      usersSocket.push('update', 'hello-users')
    })

    expect(screen.getByTestId('chat').textContent).toBe('hello-chat')
    expect(screen.getByTestId('users').textContent).toBe('hello-users')
  })
})
