/** Any socket instance — transport-agnostic */
export type AnySocket = unknown

/**
 * Maps socket names to socket instances.
 * Socket names become the first segment of all related cache keys.
 */
export type SocketsMap = Record<string, AnySocket>

/**
 * Called on mount to wire a socket event to the cache.
 * Returns a cleanup (unsubscribe) function.
 *
 * @param socket - the socket instance for this name
 * @param key    - full subscriptionKey including socket name as first segment
 * @param emit   - call this when a message arrives; triggers cache update
 */
export type SubscribeFactory<TSocket = AnySocket, TMessage = unknown> = (
  socket: TSocket,
  key: ReadonlyArray<unknown>,
  emit: (message: TMessage) => void,
) => () => void

/**
 * Reducer called on each received message.
 * Default behavior (when omitted) is replace: (_, msg) => msg
 */
export type OnReception<TData = unknown, TMessage = unknown> = (
  prev: TData | undefined,
  message: TMessage,
) => TData

export interface SockasProviderProps<TSockets extends SocketsMap> {
  sockets: TSockets
  /**
   * Per-socket subscription factory.
   * Must have the same keys as `sockets`.
   */
  subscribe: {
    [K in keyof TSockets]: SubscribeFactory<TSockets[K]>
  }
  children: React.ReactNode
}

export interface UseSockAsQueryOptions<
  TSocket = AnySocket,
  TData = unknown,
  TMessage = unknown,
> {
  /**
   * First segment must be a socket name registered in SockasProvider.
   * This is also the TanStack Query cache key.
   */
  subscriptionKey: ReadonlyArray<unknown>
  /**
   * Reducer applied to each incoming message.
   * Default: replace — (_, msg) => msg
   */
  onReception?: OnReception<TData, TMessage>
  /**
   * Per-hook override for the subscription factory.
   * Use when the global factory doesn't fit this subscription.
   */
  subscribe?: (socket: TSocket, emit: (msg: TMessage) => void) => () => void
  enabled?: boolean
  initialData?: TData
  select?: (data: TData) => TData
}

export interface UseSockAsQueryResult<TData> {
  data: TData | undefined
  isListening: boolean
  error: Error | null
  status: 'listening' | 'idle' | 'error'
}

export interface UseSockAsMutationOptions<
  TSocket = AnySocket,
  TVariables = unknown,
  TData = unknown,
> {
  /** The socket name (key in SockasProvider `sockets` map) to emit on */
  socketName: string
  mutationKey?: ReadonlyArray<unknown>
  /**
   * How to emit. Return a Promise for ack support, void for fire-and-forget.
   */
  emit: (socket: TSocket, variables: TVariables) => Promise<TData> | void
  onSuccess?: (data: TData | undefined, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
  ) => void
}

export interface UseSockAsMutationResult<TVariables, TData> {
  send: (variables: TVariables) => void
  isPending: boolean
  data: TData | undefined
  error: Error | null
}

/** Internal context shape */
export interface SockasContextValue {
  sockets: SocketsMap
  subscribe: Record<string, SubscribeFactory>
}
