import { describe, it, expect, vi } from 'vitest'
import { SubscriptionManager } from '../subscriptionManager'
import type { SubscribeFactory } from '../subscriptionManager'

function mockSocket() {
  const listeners: Map<string, Array<(msg: unknown) => void>> = new Map()
  return {
    on: vi.fn((event: string, handler: (msg: unknown) => void) => {
      const existing = listeners.get(event) ?? []
      listeners.set(event, [...existing, handler])
    }),
    off: vi.fn((event: string, handler: (msg: unknown) => void) => {
      listeners.set(
        event,
        (listeners.get(event) ?? []).filter((h) => h !== handler),
      )
    }),
    push: (event: string, message: unknown) => {
      listeners.get(event)?.forEach((h) => h(message))
    },
  }
}

type MockSocket = ReturnType<typeof mockSocket>

function makeFactory(eventName: string): SubscribeFactory<MockSocket> {
  return (socket, _key, emit) => {
    socket.on(eventName, emit)
    return () => socket.off(eventName, emit)
  }
}

describe('SubscriptionManager', () => {
  it('calls factory on subscribe, cleanup on unsubscribe', () => {
    const socket = mockSocket()
    const onData = vi.fn()
    const onError = vi.fn()

    const manager = new SubscriptionManager({
      key: ['chat', 'room'],
      socketName: 'chat',
      socket,
      factory: makeFactory('msg'),
      onReception: (_, msg) => msg,
      onData,
      onError,
    })

    manager.subscribe()
    expect(socket.on).toHaveBeenCalledTimes(1)

    socket.push('msg', 'hello')
    expect(onData).toHaveBeenCalledWith('hello')

    manager.unsubscribe()
    expect(socket.off).toHaveBeenCalledTimes(1)
  })

  it('calls onReception reducer and passes result to onData', () => {
    const socket = mockSocket()
    const onData = vi.fn()
    const onError = vi.fn()

    const manager = new SubscriptionManager({
      key: ['chat', 'messages'],
      socketName: 'chat',
      socket,
      factory: makeFactory('msg'),
      onReception: (prev = [], msg: string) =>
        [...(prev as string[]), msg] as string[],
      onData,
      onError,
    })

    manager.subscribe()
    socket.push('msg', 'a')
    socket.push('msg', 'b')

    expect(onData).toHaveBeenNthCalledWith(1, ['a'])
    expect(onData).toHaveBeenNthCalledWith(2, ['b'])
  })

  it('calls onError when onReception throws', () => {
    const socket = mockSocket()
    const onData = vi.fn()
    const onError = vi.fn()
    const boom = new Error('bad reducer')

    const manager = new SubscriptionManager({
      key: ['chat', 'room'],
      socketName: 'chat',
      socket,
      factory: makeFactory('msg'),
      onReception: () => {
        throw boom
      },
      onData,
      onError,
    })

    manager.subscribe()
    socket.push('msg', 'x')

    expect(onError).toHaveBeenCalledWith(boom)
    expect(onData).not.toHaveBeenCalled()
  })

  it('does not call cleanup twice if unsubscribe called multiple times', () => {
    const socket = mockSocket()
    const manager = new SubscriptionManager({
      key: ['k'],
      socketName: 'k',
      socket,
      factory: makeFactory('e'),
      onReception: (_, m) => m,
      onData: vi.fn(),
      onError: vi.fn(),
    })

    manager.subscribe()
    manager.unsubscribe()
    manager.unsubscribe()

    expect(socket.off).toHaveBeenCalledTimes(1)
  })
})
