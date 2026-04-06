import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SockasProvider } from '../SockasProvider'
import { useSockAsMutation } from '../useSockAsMutation'
import { mockSocket, mockSubscribeFactory } from './utils'

function setup() {
  const queryClient = new QueryClient()
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

describe('useSockAsMutation', () => {
  it('calls emit with socket and variables on send()', async () => {
    const { socket, Wrapper } = setup()
    const emitFn = vi.fn()

    function Page() {
      const { send } = useSockAsMutation({
        socketName: 'users',
        emit: (s, vars) => {
          emitFn(s, vars)
        },
      })
      return <button onClick={() => send({ name: 'Alice' })}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => {
      screen.getByRole('button').click()
    })

    expect(emitFn).toHaveBeenCalledWith(socket, { name: 'Alice' })
  })

  it('fire-and-forget: isPending is false immediately after send()', async () => {
    const { Wrapper } = setup()
    const states: boolean[] = []

    function Page() {
      const { send, isPending } = useSockAsMutation({
        socketName: 'users',
        emit: () => {},
      })
      states.push(isPending)
      return <button onClick={() => send({})}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => {
      screen.getByRole('button').click()
    })
    await act(async () => {})

    expect(states.at(-1)).toBe(false)
  })

  it('ack: isPending is true while Promise pending, false after resolve', async () => {
    const { Wrapper } = setup()
    let resolveAck!: (v: { ok: boolean }) => void
    const ackPromise = new Promise<{ ok: boolean }>((r) => {
      resolveAck = r
    })
    const states: boolean[] = []

    function Page() {
      const { send, isPending } = useSockAsMutation({
        socketName: 'users',
        emit: () => ackPromise,
      })
      states.push(isPending)
      return <button onClick={() => send({})}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => {
      screen.getByRole('button').click()
    })
    await act(async () => {})

    expect(states.at(-1)).toBe(true)

    act(() => {
      resolveAck({ ok: true })
    })
    await act(async () => {})

    expect(states.at(-1)).toBe(false)
  })

  it('ack: data is set to resolved value', async () => {
    const { Wrapper } = setup()

    function Page() {
      const { send, data } = useSockAsMutation<
        unknown,
        unknown,
        { id: number }
      >({
        socketName: 'users',
        emit: () => Promise.resolve({ id: 42 }),
      })
      return (
        <div>
          <button onClick={() => send({})}>send</button>
          <span data-testid="out">{data?.id ?? 'none'}</span>
        </div>
      )
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => {
      screen.getByRole('button').click()
    })
    await waitFor(() =>
      expect(screen.getByTestId('out').textContent).toBe('42'),
    )
  })

  it('calls onSuccess after fire-and-forget send', async () => {
    const { Wrapper } = setup()
    const onSuccess = vi.fn()

    function Page() {
      const { send } = useSockAsMutation({
        socketName: 'users',
        emit: () => {},
        onSuccess,
      })
      return <button onClick={() => send({ x: 1 })}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => {
      screen.getByRole('button').click()
    })
    await act(async () => {})

    expect(onSuccess).toHaveBeenCalledWith(undefined, { x: 1 })
  })

  it('calls onError when emit throws', async () => {
    const { Wrapper } = setup()
    const onError = vi.fn()
    const err = new Error('socket down')

    function Page() {
      const { send } = useSockAsMutation({
        socketName: 'users',
        emit: () => {
          throw err
        },
        onError,
      })
      return <button onClick={() => send({})}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => {
      screen.getByRole('button').click()
    })
    await act(async () => {})

    expect(onError).toHaveBeenCalledWith(err, {})
  })

  it('calls onSettled regardless of success or error', async () => {
    const { Wrapper } = setup()
    const onSettled = vi.fn()

    function Page() {
      const { send } = useSockAsMutation({
        socketName: 'users',
        emit: () => {},
        onSettled,
      })
      return <button onClick={() => send({ y: 2 })}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => {
      screen.getByRole('button').click()
    })
    await act(async () => {})

    expect(onSettled).toHaveBeenCalledWith(undefined, null, { y: 2 })
  })
})
