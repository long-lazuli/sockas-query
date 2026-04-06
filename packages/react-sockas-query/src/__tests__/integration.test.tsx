import * as React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
  useMutation,
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
          sockets={{ chat: socket }}
          subscribe={{
            chat: (sock, key, emit) => {
              const event = (key as string[]).slice(1).join(':')
              sock.on(event, emit)
              return () => sock.off(event, emit)
            },
          }}
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
        queryKey: ['chat', 'general', 'messages'],
        queryFn: () => {
          fetchCount++
          return Promise.resolve([{ text: `fetch-${fetchCount}` }])
        },
      })
      useSockAsQuery({
        subscriptionKey: ['chat', 'general', 'message-sent'],
        onReception: (_prev, msg) => {
          void qc.invalidateQueries({
            queryKey: ['chat', 'general', 'messages'],
          })
          return msg
        },
      })
      return <div data-testid="count">{data?.length ?? 0}</div>
    }

    render(<Page />, { wrapper: Wrapper })
    await waitFor(() =>
      expect(screen.getByTestId('count').textContent).toBe('1'),
    )

    // Server pushes 'general:message-sent' after a client sends a message
    act(() => {
      socket.push('general:message-sent', { roomId: 'general' })
    })
    await waitFor(() => expect(fetchCount).toBe(2))
  })

  it('useSockAsMutation fire-and-forget → server pushes back → useQuery refetches', async () => {
    // Real chain: client emits via socket → server processes → server broadcasts
    // → useSockAsQuery.onReception → invalidate → useQuery refetches
    const { socket, queryClient, Wrapper } = setup()
    let fetchCount = 0
    const sentToServer: unknown[] = []

    function Page() {
      const qc = useQueryClient()
      const { data } = useQuery({
        queryKey: ['chat', 'general', 'messages'],
        queryFn: () => {
          fetchCount++
          return Promise.resolve([{ id: fetchCount, text: 'msg' }])
        },
      })
      // Listens for server confirmation
      useSockAsQuery({
        subscriptionKey: ['chat', 'general', 'message-sent'],
        onReception: (_prev, event) => {
          void qc.invalidateQueries({
            queryKey: ['chat', 'general', 'messages'],
          })
          return event
        },
      })
      // Fire-and-forget send
      const { send } = useSockAsMutation<MockSocket, { text: string }, void>({
        socketName: 'chat',
        emit: (_sock, vars) => {
          // Client sends to server — capture what was sent
          sentToServer.push(vars)
          // No return = fire-and-forget; server push simulated separately below
        },
      })
      return (
        <div>
          <span data-testid="count">{data?.length ?? 0}</span>
          <button onClick={() => send({ text: 'hello' })}>send</button>
        </div>
      )
    }

    render(<Page />, { wrapper: Wrapper })
    await waitFor(() =>
      expect(screen.getByTestId('count').textContent).toBe('1'),
    )
    expect(fetchCount).toBe(1)

    // User clicks send
    act(() => {
      screen.getByRole('button').click()
    })
    expect(sentToServer).toHaveLength(1)

    // Server processes and broadcasts back (simulated)
    act(() => {
      socket.push('general:message-sent', { roomId: 'general' })
    })
    await waitFor(() => expect(fetchCount).toBe(2))
  })

  it('rename: HTTP mutation → server pushes users:renamed → invalidates all chat → only active query refetches', async () => {
    const { socket, Wrapper } = setup()
    let generalFetchCount = 0
    let randomFetchCount = 0

    // Mock fetch for the rename POST
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    vi.stubGlobal('fetch', mockFetch)

    function Page() {
      const qc = useQueryClient()

      // Active query — mounted, will refetch on invalidation
      const { data: generalMessages } = useQuery({
        queryKey: ['chat', 'general', 'messages'],
        queryFn: () => {
          generalFetchCount++
          return Promise.resolve([{ author: 'alice', text: 'hi' }])
        },
      })

      // Inactive query — not mounted, should NOT refetch immediately
      // (only becomes active when user switches room)
      void useQuery({
        queryKey: ['chat', 'random', 'messages'],
        queryFn: () => {
          randomFetchCount++
          return Promise.resolve([])
        },
        enabled: false, // simulate inactive — not currently viewed
      })

      // Listen for server-pushed rename event (global, not room-scoped)
      // key ['chat', 'users', 'renamed'] → factory maps to event 'users:renamed'
      useSockAsQuery({
        subscriptionKey: ['chat', 'users', 'renamed'],
        onReception: (_prev, event) => {
          // Invalidate ALL chat cache — TQ refetches only active queries
          void qc.invalidateQueries({ queryKey: ['chat'] })
          return event
        },
      })

      // Standard TQ useMutation — HTTP, not socket
      const { mutate: rename, isPending } = useMutation({
        mutationFn: (vars: { from: string; to: string }) =>
          fetch('/api/users/rename', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vars),
          }).then((r) => r.json()),
        // No onSuccess cache work — socket handles invalidation
      })

      return (
        <div>
          <span data-testid="general-count">
            {generalMessages?.length ?? 0}
          </span>
          <button
            onClick={() => rename({ from: 'alice', to: 'bob' })}
            disabled={isPending}
          >
            rename
          </button>
        </div>
      )
    }

    render(<Page />, { wrapper: Wrapper })
    await waitFor(() =>
      expect(screen.getByTestId('general-count').textContent).toBe('1'),
    )
    expect(generalFetchCount).toBe(1)
    expect(randomFetchCount).toBe(0) // inactive, never fetched

    // User clicks rename → HTTP POST resolves
    act(() => {
      screen.getByRole('button').click()
    })
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    // Server pushes 'users:renamed' after processing rename
    act(() => {
      socket.push('users:renamed', { from: 'alice', to: 'bob' })
    })

    // Active query refetches
    await waitFor(() => expect(generalFetchCount).toBe(2))
    // Inactive query was invalidated but NOT refetched
    expect(randomFetchCount).toBe(0)

    vi.unstubAllGlobals()
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
