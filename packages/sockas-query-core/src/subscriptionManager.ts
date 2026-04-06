export type AnySocket = unknown

export type SubscribeFactory<TSocket = AnySocket, TMessage = unknown> = (
  socket: TSocket,
  key: ReadonlyArray<unknown>,
  emit: (message: TMessage) => void,
) => () => void

export type OnReception<TData = unknown, TMessage = unknown> = (
  prev: TData | undefined,
  message: TMessage,
) => TData

export interface SubscriptionManagerOptions<
  TData,
  TMessage,
  TSocket = AnySocket,
> {
  key: ReadonlyArray<unknown>
  socketName: string
  socket: TSocket
  factory: SubscribeFactory<TSocket, TMessage>
  onReception: OnReception<TData, TMessage>
  onData: (data: TData) => void
  onError: (error: Error) => void
}

export class SubscriptionManager<TData, TMessage, TSocket = AnySocket> {
  private cleanup: (() => void) | null = null

  constructor(
    private readonly options: SubscriptionManagerOptions<
      TData,
      TMessage,
      TSocket
    >,
  ) {}

  subscribe(): void {
    const { key, socket, factory, onReception, onData, onError } = this.options

    const emit = (message: TMessage): void => {
      try {
        const next = onReception(undefined, message)
        onData(next)
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)))
      }
    }

    try {
      this.cleanup = factory(socket, key, emit)
    } catch (e) {
      onError(e instanceof Error ? e : new Error(String(e)))
    }
  }

  unsubscribe(): void {
    this.cleanup?.()
    this.cleanup = null
  }
}
