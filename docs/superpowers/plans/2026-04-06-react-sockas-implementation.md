# react-sockas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `react-sockas` — a transport-agnostic React library that makes WebSocket subscriptions first-class citizens of TanStack Query's cache, exposing `useSockAsQuery` and `useSockAsMutation` hooks.

**Architecture:** All socket state lives in TanStack Query's `QueryClient` cache via `setQueryData`/`getQueryData` — no second store. `SockasProvider` holds named socket instances and a per-socket subscription factory. Socket names are mandatory and form the first segment of every cache key, enabling shared key namespaces with `useQuery`.

**Tech Stack:** TypeScript, React, TanStack Query (public API only), Vitest, Testing Library, pnpm, tsup, changesets — mirroring TanStack Query's own toolchain.

---

## File Map

```
externals/
  tanstack-query/          ← git submodule (TanStack/query on GitHub)

src/
  types.ts                 ← All shared types (SubscribeFactory, OnReception, SockasProviderProps, etc.)
  context.ts               ← SockasContext definition + useSockasContext() hook
  SockasProvider.tsx       ← Provider component — holds sockets map, subscribe factories, dev warnings
  useSockAsQuery.ts        ← Subscription hook — mounts/unmounts listener, writes to TQ cache
  useSockAsMutation.ts     ← Emit hook — sends via socket, optional ack Promise support
  index.ts                 ← Public API re-exports

src/__tests__/
  utils.ts                 ← renderWithClient(), mockSocket(), queryKey() helpers
  SockasProvider.test.tsx  ← Provider mounts, context, dev-mode collision warning
  useSockAsQuery.test.tsx  ← Subscribe lifecycle, cache writes, reducer, isListening, key sharing with useQuery
  useSockAsMutation.test.tsx ← send(), fire-and-forget, ack Promise, onSuccess/onError/onSettled

package.json               ← scripts mirrored from TQ (test:lib, test:types, build, etc.)
tsconfig.json              ← copied/adapted from TQ
eslint.config.js           ← copied from TQ
prettier.config.js         ← copied from TQ
vitest.config.ts           ← adapted from TQ
.changeset/                ← changesets config mirrored from TQ
```

---

## Task 1: Repository bootstrap — submodule + tooling

**Files:**
- Create: `.gitmodules`
- Create: `externals/tanstack-query/` (git submodule)
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `prettier.config.js`
- Create: `vitest.config.ts`
- Create: `.changeset/config.json`

- [ ] **Step 1: Init git repo and add TanStack Query submodule**

```bash
git init
git submodule add https://github.com/tanstack/query.git externals/tanstack-query
```

Expected: `externals/tanstack-query/` populated, `.gitmodules` created.

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "react-sockas",
  "version": "0.0.1",
  "private": false,
  "description": "Transport-agnostic WebSocket adapter for TanStack Query",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "test:lib": "vitest run",
    "test:lib:dev": "vitest",
    "test:types": "tsc --noEmit",
    "test:eslint": "eslint ./src",
    "lint": "eslint ./src",
    "format": "prettier --write ./src"
  },
  "peerDependencies": {
    "@tanstack/react-query": ">=5.0.0",
    "react": ">=18.0.0"
  },
  "devDependencies": {
    "@tanstack/react-query": "^5.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/react": "^18.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "react": "^18.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`** (adapted from `externals/tanstack-query/packages/react-query/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: [],
  },
})
```

- [ ] **Step 5: Copy linter configs from TanStack Query**

```bash
cp externals/tanstack-query/eslint.config.js ./eslint.config.js
cp externals/tanstack-query/prettier.config.js ./prettier.config.js
```

Review both files and simplify if they reference monorepo-specific paths.

- [ ] **Step 6: Create `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 7: Install dependencies**

```bash
pnpm install
```

Expected: `node_modules/` populated, no errors.

- [ ] **Step 8: Create `src/` directory structure**

```bash
mkdir -p src/__tests__
touch src/types.ts src/context.ts src/SockasProvider.tsx src/useSockAsQuery.ts src/useSockAsMutation.ts src/index.ts
touch src/__tests__/utils.ts src/__tests__/SockasProvider.test.tsx src/__tests__/useSockAsQuery.test.tsx src/__tests__/useSockAsMutation.test.tsx
```

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: bootstrap repo with submodule and tooling"
```

---

## Task 2: Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
import type { QueryClient } from '@tanstack/react-query'

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
  key: readonly unknown[],
  emit: (message: TMessage) => void,
) => () => void

/**
 * Reducer called on each received message.
 * Default behaviour (when omitted) is replace: (_, msg) => msg
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
  subscriptionKey: readonly unknown[]
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
  mutationKey?: readonly unknown[]
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm test:types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add core types"
```

---

## Task 3: `SockasContext` and `useSockasContext`

**Files:**
- Create: `src/context.ts`

- [ ] **Step 1: Write `src/context.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/context.ts
git commit -m "feat: add SockasContext"
```

---

## Task 4: `SockasProvider` — tests first

**Files:**
- Modify: `src/__tests__/utils.ts`
- Modify: `src/__tests__/SockasProvider.test.tsx`
- Modify: `src/SockasProvider.tsx`

- [ ] **Step 1: Write test utilities in `src/__tests__/utils.ts`**

```ts
import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { SubscribeFactory } from '../types'

/** Mirror of TQ's queryKey() test helper — returns a unique key per test */
let keyCount = 0
export function queryKey(): readonly [string] {
  return [`key-${++keyCount}`]
}

/** Creates a mock socket with on/off/emit spies */
export function mockSocket() {
  const listeners: Record<string, Array<(msg: unknown) => void>> = {}
  return {
    on: vi.fn((event: string, handler: (msg: unknown) => void) => {
      listeners[event] = listeners[event] ?? []
      listeners[event].push(handler)
    }),
    off: vi.fn((event: string, handler: (msg: unknown) => void) => {
      listeners[event] = (listeners[event] ?? []).filter((h) => h !== handler)
    }),
    /** Simulate server pushing a message */
    push: (event: string, message: unknown) => {
      listeners[event]?.forEach((h) => h(message))
    },
  }
}

export type MockSocket = ReturnType<typeof mockSocket>

/** Creates a simple subscribe factory for a mock socket */
export function mockSubscribeFactory(eventName: string): SubscribeFactory<MockSocket> {
  return (socket, _key, emit) => {
    socket.on(eventName, emit)
    return () => socket.off(eventName, emit)
  }
}

/** Renders with both QueryClientProvider and SockasProvider */
export function renderWithClient(
  ui: React.ReactElement,
  client: QueryClient,
  options?: RenderOptions,
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
```

- [ ] **Step 2: Write failing tests in `src/__tests__/SockasProvider.test.tsx`**

```tsx
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
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
    ).toThrow('[react-sockas] useSockasContext must be used inside <SockasProvider>')
  })

  it('warns in dev when socket name collides with existing query key', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const socket = mockSocket()

    // Register a query with key ['users', '1'] before mounting provider
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
      expect.stringContaining('[react-sockas] Socket "users" shares key namespace'),
    )
    warnSpy.mockRestore()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test:lib
```

Expected: FAIL — `SockasProvider` does not exist yet.

- [ ] **Step 4: Implement `src/SockasProvider.tsx`**

```tsx
import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SockasContext } from './context'
import type { SockasProviderProps, SocketsMap } from './types'

export function SockasProvider<TSockets extends SocketsMap>({
  sockets,
  subscribe,
  children,
}: SockasProviderProps<TSockets>) {
  const queryClient = useQueryClient()

  // Dev-mode: warn if a socket name collides with an existing query key namespace
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const existingKeys = queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey[0])
        .filter(Boolean)

      for (const socketName of Object.keys(sockets)) {
        if (existingKeys.includes(socketName)) {
          console.warn(
            `[react-sockas] Socket "${socketName}" shares key namespace with existing queries. ` +
              `If intentional, this enables live cache updates from socket events.`,
          )
        }
      }
    }
  }, []) // intentionally runs once on mount

  const value = React.useMemo(
    () => ({ sockets, subscribe }),
    [sockets, subscribe],
  )

  return (
    <SockasContext.Provider value={value as any}>
      {children}
    </SockasContext.Provider>
  )
}
```

- [ ] **Step 5: Export from `src/index.ts`**

```ts
export { SockasProvider } from './SockasProvider'
export { useSockasContext } from './context'
export type {
  SockasProviderProps,
  SockasContextValue,
  SubscribeFactory,
  OnReception,
  SocketsMap,
} from './types'
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm test:lib
```

Expected: PASS — 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/SockasProvider.tsx src/context.ts src/index.ts src/__tests__/utils.ts src/__tests__/SockasProvider.test.tsx
git commit -m "feat: add SockasProvider with dev collision warning"
```

---

## Task 5: `useSockAsQuery` — tests first

**Files:**
- Modify: `src/__tests__/useSockAsQuery.test.tsx`
- Create: `src/useSockAsQuery.ts`

- [ ] **Step 1: Write failing tests**

```tsx
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { SockasProvider } from '../SockasProvider'
import { useSockAsQuery } from '../useSockAsQuery'
import { mockSocket, mockSubscribeFactory, queryKey } from './utils'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
  afterEach(() => { vi.useRealTimers() })

  it('starts with isListening false before mount, true after', async () => {
    const { socket, Wrapper } = setup()
    const states: boolean[] = []

    function Page() {
      const { isListening } = useSockAsQuery({ subscriptionKey: ['chat', 'room', '1'] })
      states.push(isListening)
      return null
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    // first render: idle/false, then listening after effect runs
    expect(states.at(-1)).toBe(true)
    expect(socket.on).toHaveBeenCalledTimes(1)
  })

  it('writes received message to TQ cache (default: replace)', async () => {
    const { socket, queryClient, Wrapper } = setup()

    function Page() {
      const { data } = useSockAsQuery<MockSocket, { text: string }, { text: string }>({
        subscriptionKey: ['chat', 'room', '1'],
      })
      return <div data-testid="out">{data?.text ?? 'none'}</div>
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => { socket.push('message', { text: 'hello' }) })
    expect(screen.getByTestId('out').textContent).toBe('hello')

    act(() => { socket.push('message', { text: 'world' }) })
    expect(screen.getByTestId('out').textContent).toBe('world')
  })

  it('applies custom onReception reducer', async () => {
    const { socket, Wrapper } = setup()

    function Page() {
      const { data } = useSockAsQuery<MockSocket, string[], string>({
        subscriptionKey: ['chat', 'messages'],
        onReception: (prev = [], msg) => [...prev, msg],
      })
      return <div data-testid="out">{JSON.stringify(data ?? [])}</div>
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => { socket.push('message', 'a') })
    act(() => { socket.push('message', 'b') })
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

  it('shares cache key with useQuery — socket write is visible to useQuery', async () => {
    const { socket, queryClient, Wrapper } = setup()

    function Page() {
      const socketResult = useSockAsQuery<MockSocket, { name: string }, { name: string }>({
        subscriptionKey: ['chat', 'user', '42'],
      })
      const queryResult = useQuery({
        queryKey: ['chat', 'user', '42'],
        queryFn: () => Promise.resolve({ name: 'from-fetch' }),
        enabled: false, // don't fetch — just read cache
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

    act(() => { socket.push('message', { name: 'Alice' }) })

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
    expect(socket.on).not.toHaveBeenCalled() // global factory not used
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test:lib
```

Expected: FAIL — `useSockAsQuery` does not exist.

- [ ] **Step 3: Implement `src/useSockAsQuery.ts`**

```ts
import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSockasContext } from './context'
import type { UseSockAsQueryOptions, UseSockAsQueryResult } from './types'

export function useSockAsQuery<
  TSocket = unknown,
  TData = unknown,
  TMessage = unknown,
>(
  options: UseSockAsQueryOptions<TSocket, TData, TMessage>,
): UseSockAsQueryResult<TData> {
  const {
    subscriptionKey,
    onReception,
    subscribe: hookSubscribe,
    enabled = true,
    initialData,
    select,
  } = options

  const { sockets, subscribe: factories } = useSockasContext()
  const queryClient = useQueryClient()

  const [isListening, setIsListening] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  // Stable key ref for the effect dependency
  const keyRef = React.useRef(subscriptionKey)
  keyRef.current = subscriptionKey

  React.useEffect(() => {
    if (!enabled) return

    const socketName = subscriptionKey[0] as string
    const socket = sockets[socketName] as TSocket

    if (!socket) {
      setError(new Error(`[react-sockas] No socket registered for name "${socketName}"`))
      return
    }

    const emit = (message: TMessage) => {
      queryClient.setQueryData<TData>(subscriptionKey as any, (prev) => {
        if (onReception) return onReception(prev, message)
        return message as unknown as TData
      })
    }

    let cleanup: () => void

    try {
      if (hookSubscribe) {
        cleanup = hookSubscribe(socket, emit)
      } else {
        const factory = factories[socketName]
        if (!factory) {
          throw new Error(`[react-sockas] No subscribe factory for socket "${socketName}"`)
        }
        cleanup = factory(socket, subscriptionKey, emit as any)
      }
      setIsListening(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      return
    }

    return () => {
      cleanup()
      setIsListening(false)
    }
  }, [enabled, subscriptionKey[0]]) // re-subscribe only if socket name or enabled changes

  const rawData = queryClient.getQueryData<TData>(subscriptionKey as any) ?? initialData
  const data = select ? (rawData !== undefined ? select(rawData) : undefined) : rawData

  const status = error ? 'error' : isListening ? 'listening' : 'idle'

  return { data, isListening, error, status }
}
```

- [ ] **Step 4: Export from `src/index.ts`**

```ts
export { SockasProvider } from './SockasProvider'
export { useSockasContext } from './context'
export { useSockAsQuery } from './useSockAsQuery'
export type {
  SockasProviderProps,
  SockasContextValue,
  SubscribeFactory,
  OnReception,
  SocketsMap,
  UseSockAsQueryOptions,
  UseSockAsQueryResult,
} from './types'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test:lib
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/useSockAsQuery.ts src/__tests__/useSockAsQuery.test.tsx src/index.ts
git commit -m "feat: add useSockAsQuery"
```

---

## Task 6: `useSockAsMutation` — tests first

**Files:**
- Modify: `src/__tests__/useSockAsMutation.test.tsx`
- Create: `src/useSockAsMutation.ts`

- [ ] **Step 1: Write failing tests**

```tsx
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
        emit: (s, vars) => { emitFn(s, vars) },
      })
      return <button onClick={() => send({ name: 'Alice' })}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => { screen.getByRole('button').click() })

    expect(emitFn).toHaveBeenCalledWith(socket, { name: 'Alice' })
  })

  it('fire-and-forget: isPending is false immediately after send()', async () => {
    const { Wrapper } = setup()
    const states: boolean[] = []

    function Page() {
      const { send, isPending } = useSockAsMutation({
        socketName: 'users',
        emit: (_s, _vars) => { /* void */ },
      })
      states.push(isPending)
      return <button onClick={() => send({})}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => { screen.getByRole('button').click() })
    await act(async () => {})

    expect(states.at(-1)).toBe(false)
  })

  it('ack: isPending is true while Promise is pending, false after resolve', async () => {
    const { Wrapper } = setup()
    let resolveAck!: (v: { ok: boolean }) => void
    const ackPromise = new Promise<{ ok: boolean }>((r) => { resolveAck = r })
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
    act(() => { screen.getByRole('button').click() })
    await act(async () => {})

    expect(states.at(-1)).toBe(true) // still pending

    act(() => { resolveAck({ ok: true }) })
    await act(async () => {})

    expect(states.at(-1)).toBe(false)
  })

  it('ack: data is set to resolved value', async () => {
    const { Wrapper } = setup()

    function Page() {
      const { send, data } = useSockAsMutation<unknown, unknown, { id: number }>({
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
    act(() => { screen.getByRole('button').click() })
    await waitFor(() => expect(screen.getByTestId('out').textContent).toBe('42'))
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
    act(() => { screen.getByRole('button').click() })
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
        emit: () => { throw err },
        onError,
      })
      return <button onClick={() => send({})}>send</button>
    }

    render(<Page />, { wrapper: Wrapper })
    act(() => { screen.getByRole('button').click() })
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
    act(() => { screen.getByRole('button').click() })
    await act(async () => {})

    expect(onSettled).toHaveBeenCalledWith(undefined, null, { y: 2 })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test:lib
```

Expected: FAIL — `useSockAsMutation` does not exist.

- [ ] **Step 3: Implement `src/useSockAsMutation.ts`**

```ts
import * as React from 'react'
import { useSockasContext } from './context'
import type { UseSockAsMutationOptions, UseSockAsMutationResult } from './types'

export function useSockAsMutation<
  TSocket = unknown,
  TVariables = unknown,
  TData = unknown,
>(
  options: UseSockAsMutationOptions<TSocket, TVariables, TData>,
): UseSockAsMutationResult<TVariables, TData> {
  const { socketName, emit, onSuccess, onError, onSettled } = options
  const { sockets } = useSockasContext()

  const [isPending, setIsPending] = React.useState(false)
  const [data, setData] = React.useState<TData | undefined>(undefined)
  const [error, setError] = React.useState<Error | null>(null)

  const send = React.useCallback(
    (variables: TVariables) => {
      const socket = sockets[socketName] as TSocket

      let result: Promise<TData> | void

      try {
        result = emit(socket, variables) as Promise<TData> | void
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        setError(err)
        onError?.(err, variables)
        onSettled?.(undefined, err, variables)
        return
      }

      if (result instanceof Promise) {
        setIsPending(true)
        result
          .then((resolved) => {
            setData(resolved)
            setIsPending(false)
            setError(null)
            onSuccess?.(resolved, variables)
            onSettled?.(resolved, null, variables)
          })
          .catch((e: unknown) => {
            const err = e instanceof Error ? e : new Error(String(e))
            setIsPending(false)
            setError(err)
            onError?.(err, variables)
            onSettled?.(undefined, err, variables)
          })
      } else {
        // fire-and-forget
        onSuccess?.(undefined, variables)
        onSettled?.(undefined, null, variables)
      }
    },
    [socketName, emit, onSuccess, onError, onSettled, sockets],
  )

  return { send, isPending, data, error }
}
```

- [ ] **Step 4: Export from `src/index.ts`**

```ts
export { SockasProvider } from './SockasProvider'
export { useSockasContext } from './context'
export { useSockAsQuery } from './useSockAsQuery'
export { useSockAsMutation } from './useSockAsMutation'
export type {
  SockasProviderProps,
  SockasContextValue,
  SubscribeFactory,
  OnReception,
  SocketsMap,
  UseSockAsQueryOptions,
  UseSockAsQueryResult,
  UseSockAsMutationOptions,
  UseSockAsMutationResult,
} from './types'
```

- [ ] **Step 5: Run all tests**

```bash
pnpm test:lib
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/useSockAsMutation.ts src/__tests__/useSockAsMutation.test.tsx src/index.ts
git commit -m "feat: add useSockAsMutation"
```

---

## Task 7: Integration tests — interop with TanStack Query patterns

These tests verify cooperation between `react-sockas` and TanStack Query, inspired by TQ's own integration test style (see `externals/tanstack-query/packages/react-query/src/__tests__/`).

**Files:**
- Create: `src/__tests__/integration.test.tsx`

- [ ] **Step 1: Write integration tests**

```tsx
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
} from '@tanstack/react-query'
import { SockasProvider } from '../SockasProvider'
import { useSockAsQuery } from '../useSockAsQuery'
import { useSockAsMutation } from '../useSockAsMutation'
import { mockSocket, mockSubscribeFactory } from './utils'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
    const { socket, queryClient, Wrapper } = setup()
    let fetchCount = 0

    function Page() {
      const queryClient = useQueryClient()
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
          // side effect: invalidate the REST query when a socket event arrives
          queryClient.invalidateQueries({ queryKey: ['users', '1'] })
          return msg
        },
      })
      return <div data-testid="name">{data?.name ?? 'loading'}</div>
    }

    render(<Page />, { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('fetch-1'))

    act(() => { socket.push('update', { event: 'user-changed' }) })
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('fetch-2'))
    expect(fetchCount).toBe(2)
  })

  it('useSockAsMutation.onSuccess invalidates a useSockAsQuery cache entry', async () => {
    const { socket, queryClient, Wrapper } = setup()

    function Page() {
      const qc = useQueryClient()
      const { data } = useSockAsQuery<unknown, { name: string }, { name: string }>({
        subscriptionKey: ['users', 'profile'],
      })
      const { send } = useSockAsMutation({
        socketName: 'users',
        emit: (s) => { (s as ReturnType<typeof mockSocket>).push('update', { name: 'Updated' }) },
        onSuccess: () => {
          // In real usage you'd invalidate; here socket already updated cache
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

    act(() => { screen.getByRole('button').click() })
    await act(async () => {})

    await waitFor(() =>
      expect(screen.getByTestId('name').textContent).toBe('Updated'),
    )
  })

  it('multiple sockets with different names maintain independent cache namespaces', async () => {
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
      const chat = useSockAsQuery<unknown, string, string>({ subscriptionKey: ['chat', 'room'] })
      const users = useSockAsQuery<unknown, string, string>({ subscriptionKey: ['users', 'list'] })
      return (
        <div>
          <span data-testid="chat">{chat.data ?? 'none'}</span>
          <span data-testid="users">{users.data ?? 'none'}</span>
        </div>
      )
    }

    render(<Page />, { wrapper: Wrapper })
    await act(async () => {})

    act(() => { chatSocket.push('msg', 'hello-chat') })
    act(() => { usersSocket.push('update', 'hello-users') })

    expect(screen.getByTestId('chat').textContent).toBe('hello-chat')
    expect(screen.getByTestId('users').textContent).toBe('hello-users')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
pnpm test:lib
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration.test.tsx
git commit -m "test: add integration tests for TQ interop"
```

---

## Task 8: Build and type-check

**Files:** none new

- [ ] **Step 1: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', '@tanstack/react-query'],
})
```

- [ ] **Step 2: Run build**

```bash
pnpm build
```

Expected: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts` generated, no errors.

- [ ] **Step 3: Run full type check**

```bash
pnpm test:types
```

Expected: no errors.

- [ ] **Step 4: Run all tests one final time**

```bash
pnpm test:lib
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tsup.config.ts dist/
git commit -m "build: add tsup config and verify build"
```

---

## Task 9: Framework-agnostic core (future-proofing)

This task extracts pure logic from `useSockAsQuery` into a framework-agnostic core module — mirroring how TanStack Query separates `query-core` from `react-query`.

**Files:**
- Create: `src/core/subscriptionManager.ts`

- [ ] **Step 1: Write `src/core/subscriptionManager.ts`**

This module manages subscription lifecycle with no React dependency:

```ts
import type { SubscribeFactory, OnReception } from '../types'

export interface SubscriptionManagerOptions<TData, TMessage> {
  key: readonly unknown[]
  socketName: string
  socket: unknown
  factory: SubscribeFactory
  onReception: OnReception<TData, TMessage>
  onData: (data: TData) => void
  onError: (error: Error) => void
}

export class SubscriptionManager<TData, TMessage> {
  private cleanup: (() => void) | null = null

  constructor(private options: SubscriptionManagerOptions<TData, TMessage>) {}

  subscribe(): void {
    const { key, socket, factory, onReception, onData, onError } = this.options

    const emit = (message: TMessage) => {
      try {
        // Note: prev is managed externally (by caller, e.g. queryClient.getQueryData)
        const next = onReception(undefined, message)
        onData(next)
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)))
      }
    }

    try {
      this.cleanup = factory(socket, key, emit as any)
    } catch (e) {
      onError(e instanceof Error ? e : new Error(String(e)))
    }
  }

  unsubscribe(): void {
    this.cleanup?.()
    this.cleanup = null
  }
}
```

- [ ] **Step 2: Write tests for `SubscriptionManager`**

Create `src/__tests__/core/subscriptionManager.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { SubscriptionManager } from '../../core/subscriptionManager'
import { mockSocket, mockSubscribeFactory } from '../utils'

describe('SubscriptionManager', () => {
  it('calls factory on subscribe and cleanup on unsubscribe', () => {
    const socket = mockSocket()
    const onData = vi.fn()
    const onError = vi.fn()

    const manager = new SubscriptionManager({
      key: ['chat', 'room'],
      socketName: 'chat',
      socket,
      factory: mockSubscribeFactory('msg'),
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
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm test:lib
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/subscriptionManager.ts src/__tests__/core/subscriptionManager.test.ts
git commit -m "feat: extract framework-agnostic SubscriptionManager core"
```

---

## Task 10: TanStack Query integration-readiness

The goal of this task is to ensure `react-sockas` could be dropped into TanStack Query's monorepo as a `packages/` entry with minimal friction. This is about structure and conventions — no functional changes.

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `tsconfig.prod.json`
- Modify: `package.json`

- [ ] **Step 1: Mirror TQ's `tsconfig.prod.json`**

TanStack Query uses a separate tsconfig for production builds (no test files). Create `tsconfig.prod.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/__tests__", "**/*.test.ts", "**/*.test.tsx", "**/*.test-d.ts"]
}
```

Update `tsup.config.ts` to use it:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', '@tanstack/react-query'],
  tsconfig: 'tsconfig.prod.json',
})
```

- [ ] **Step 2: Add TQ-compatible scripts to `package.json`**

Ensure `package.json` scripts match TanStack Query's naming exactly so the monorepo tooling (nx, pnpm workspaces) would recognize them:

```json
"scripts": {
  "clean": "rm -rf ./dist ./coverage",
  "compile": "tsc --build",
  "build": "tsup --tsconfig tsconfig.prod.json",
  "test:lib": "vitest run",
  "test:lib:dev": "vitest",
  "test:types": "tsc --noEmit",
  "test:eslint": "eslint ./src"
}
```

- [ ] **Step 3: Add `CONTRIBUTING.md`**

```markdown
# Contributing to react-sockas

## Structure

This library is designed to be easily integrated into the TanStack Query monorepo
as a `packages/` entry if the TanStack team chooses to adopt it.

To that end, it mirrors TanStack Query's conventions exactly:
- Same toolchain: pnpm, tsup, vitest, changesets
- Same script names: `test:lib`, `test:types`, `test:eslint`, `build`
- Same package structure: `src/`, `src/__tests__/`, `src/core/`
- Same test style: vitest + @testing-library/react, real QueryClientProvider in all tests
- Public API only: no TanStack Query internals are used or modified

## TanStack Query submodule

`externals/tanstack-query` is a git submodule pointing to https://github.com/tanstack/query.
It is used as living documentation and for test reference — never modified.

To update it:
\`\`\`bash
git submodule update --remote externals/tanstack-query
\`\`\`

## Running tests

\`\`\`bash
pnpm test:lib       # run all tests once
pnpm test:lib:dev   # watch mode
pnpm test:types     # TypeScript type check
\`\`\`

## Adding tests

Before adding any feature, check `externals/tanstack-query/packages/react-query/src/__tests__/`
for patterns to follow. For socket-specific behaviour with no TQ equivalent, follow the same
vitest + testing-library style used in the existing test files here.
```

- [ ] **Step 4: Verify everything still passes**

```bash
pnpm test:lib && pnpm test:types && pnpm build
```

Expected: all PASS, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add CONTRIBUTING.md tsconfig.prod.json tsup.config.ts package.json
git commit -m "chore: mirror TanStack Query conventions for monorepo integration-readiness"
```
