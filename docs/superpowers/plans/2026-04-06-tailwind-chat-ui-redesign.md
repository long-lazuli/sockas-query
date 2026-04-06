# Tailwind Chat UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline-style chat UI in `examples/react/` with a Tailwind CSS layout matching TanStack Query's chat demo style — sidebar, message bubbles, connection indicator.

**Architecture:** Add Tailwind v4 via the `@tailwindcss/vite` plugin; rewrite all five components and `App.tsx` with Tailwind classes; add `style.css` entry and import it in `main.tsx`.

**Tech Stack:** Tailwind CSS v4, `@tailwindcss/vite`, React 19, Vite 6, TypeScript strict

---

### Task 1: Add Tailwind dependencies to `examples/react/package.json`

**Files:**

- Modify: `examples/react/package.json`

- [ ] **Step 1: Add Tailwind devDependencies**

Edit `examples/react/package.json` — add two entries to `devDependencies`:

```json
"tailwindcss": "^4.0.0",
"@tailwindcss/vite": "^4.0.0"
```

The full `devDependencies` block becomes:

```json
"devDependencies": {
  "@tailwindcss/vite": "^4.0.0",
  "@types/node": "^20.0.0",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0",
  "@vitejs/plugin-react": "^4.3.4",
  "tailwindcss": "^4.0.0",
  "typescript": "~5.6.2",
  "vite": "^6.0.5"
}
```

- [ ] **Step 2: Run pnpm install from repo root**

```bash
cd /Users/long-lazuli/Projects/sources/long-lazuli/react-query-socket-adapter
pnpm install
```

Expected: lockfile updated, `tailwindcss` and `@tailwindcss/vite` appear in `examples/react/node_modules/`.

---

### Task 2: Update `vite.config.ts` to use `@tailwindcss/vite` plugin

**Files:**

- Modify: `examples/react/vite.config.ts`

- [ ] **Step 1: Replace vite.config.ts content**

Replace the entire file with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

---

### Task 3: Create `style.css` and import it in `main.tsx`

**Files:**

- Create: `examples/react/src/style.css`
- Modify: `examples/react/src/main.tsx`

- [ ] **Step 1: Create `examples/react/src/style.css`**

```css
@import 'tailwindcss';
```

- [ ] **Step 2: Add CSS import to `main.tsx`**

Add `import './style.css'` as the first line of `examples/react/src/main.tsx`. The full file becomes:

```tsx
import './style.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SockasProvider } from '@sockas-query/react'
import { socket } from './socket'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SockasProvider
        sockets={{ chat: socket }}
        subscribe={{
          // Global factory: key ['chat', ...rest] → listens to rest.join(':') event
          // e.g. ['chat', 'general', 'message-sent'] → listens to 'general:message-sent'
          chat: (sock, key, emit) => {
            const event = (key as string[]).slice(1).join(':')
            sock.on(event, emit)
            return () => sock.off(event, emit)
          },
        }}
      >
        <App />
      </SockasProvider>
    </QueryClientProvider>
  </StrictMode>,
)
```

---

### Task 4: Rewrite `App.tsx`

**Files:**

- Modify: `examples/react/src/App.tsx`

- [ ] **Step 1: Replace App.tsx with Tailwind sidebar layout**

```tsx
import { useState } from 'react'
import { RoomSelector } from './components/RoomSelector'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { SocketListener } from './components/SocketListener'
import { UserRename } from './components/UserRename'

export default function App() {
  const [roomId, setRoomId] = useState('general')
  const [author, setAuthor] = useState(
    () => `user-${Math.random().toString(36).slice(2, 6)}`,
  )

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-56 bg-gray-900 text-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-bold text-lg">sockas-query</h1>
          <p className="text-xs text-gray-400 mt-1">chat demo</p>
        </div>

        {/* Rooms */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1">
            Rooms
          </p>
          <RoomSelector roomId={roomId} onRoomChange={setRoomId} />
        </div>

        {/* Identity */}
        <div className="p-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Chatting as</p>
          <p className="text-sm font-semibold truncate">{author}</p>
          <UserRename author={author} onRenamed={setAuthor} />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 bg-white border-b flex items-center justify-between px-4 shadow-sm">
          <span className="font-semibold text-gray-700">#{roomId}</span>
          <SocketListener roomId={roomId} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList roomId={roomId} author={author} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-3">
          <MessageInput roomId={roomId} author={author} />
        </div>
      </div>
    </div>
  )
}
```

---

### Task 5: Rewrite `MessageList.tsx` — add `author` prop for own-message alignment

**Files:**

- Modify: `examples/react/src/components/MessageList.tsx`

- [ ] **Step 1: Replace MessageList.tsx**

```tsx
import { useQuery } from '@tanstack/react-query'

type Message = { id: string; author: string; text: string; at: string }

interface Props {
  roomId: string
  author: string
}

export function MessageList({ roomId, author }: Props) {
  const { data: messages = [], isFetching } = useQuery<Message[]>({
    queryKey: ['chat', roomId, 'messages'],
    queryFn: () => fetch(`/api/rooms/${roomId}/messages`).then((r) => r.json()),
  })

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {isFetching && (
        <p className="text-center text-xs text-gray-400 animate-pulse">
          refreshing...
        </p>
      )}
      {messages.length === 0 && !isFetching && (
        <p className="text-center text-sm text-gray-400 mt-8">
          No messages yet. Say something!
        </p>
      )}
      {messages.map((msg) => {
        const isOwn = msg.author === author
        return (
          <div
            key={msg.id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[70%]">
              {!isOwn && (
                <p className="text-xs text-gray-500 mb-1 px-1">{msg.author}</p>
              )}
              <div
                className={`rounded-2xl px-4 py-2 text-sm ${
                  isOwn
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
              <p
                className={`text-xs text-gray-400 mt-0.5 px-1 ${isOwn ? 'text-right' : ''}`}
              >
                {new Date(msg.at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

---

### Task 6: Rewrite `MessageInput.tsx`

**Files:**

- Modify: `examples/react/src/components/MessageInput.tsx`

- [ ] **Step 1: Replace MessageInput.tsx**

```tsx
import { useState } from 'react'
import { useSockAsMutation } from '@sockas-query/react'
import { socket } from '../socket'

interface Props {
  roomId: string
  author: string
}

export function MessageInput({ roomId, author }: Props) {
  const [text, setText] = useState('')

  const { send } = useSockAsMutation<typeof socket, { text: string }, void>({
    socketName: 'chat',
    emit: (sock, { text: messageText }) => {
      sock.emit('send-message', { roomId, author, text: messageText })
    },
  })

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    send({ text: trimmed })
    setText('')
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
        className="flex-1 px-4 py-2 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-2xl shadow-sm transition text-sm"
      >
        Send
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
          <path d="m21.854 2.147-10.94 10.939" />
        </svg>
      </button>
    </div>
  )
}
```

---

### Task 7: Rewrite `RoomSelector.tsx`

**Files:**

- Modify: `examples/react/src/components/RoomSelector.tsx`

- [ ] **Step 1: Replace RoomSelector.tsx**

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSockAsMutation } from '@sockas-query/react'
import { socket } from '../socket'

type Room = { id: string; name: string }

interface Props {
  roomId: string
  onRoomChange: (id: string) => void
}

export function RoomSelector({ roomId, onRoomChange }: Props) {
  const queryClient = useQueryClient()

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => fetch('/api/rooms').then((r) => r.json()),
  })

  const { send: joinRoom } = useSockAsMutation<
    typeof socket,
    { newRoomId: string },
    void
  >({
    socketName: 'chat',
    emit: (sock, { newRoomId }) => {
      sock.emit('join-room', { newRoomId })
    },
    onSuccess: (_data, { newRoomId }) => {
      onRoomChange(newRoomId)
      void queryClient.invalidateQueries({
        queryKey: ['chat', newRoomId, 'messages'],
      })
    },
  })

  return (
    <ul className="space-y-0.5">
      {rooms.map((room) => (
        <li key={room.id}>
          <button
            onClick={() => joinRoom({ newRoomId: room.id })}
            disabled={room.id === roomId}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
              room.id === roomId
                ? 'bg-gray-700 text-white font-semibold'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            # {room.id}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

---

### Task 8: Rewrite `SocketListener.tsx`

**Files:**

- Modify: `examples/react/src/components/SocketListener.tsx`

- [ ] **Step 1: Replace SocketListener.tsx**

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { useSockAsQuery } from '@sockas-query/react'

interface Props {
  roomId: string
}

export function SocketListener({ roomId }: Props) {
  const queryClient = useQueryClient()

  const { isListening } = useSockAsQuery<
    unknown,
    { roomId: string },
    { roomId: string }
  >({
    subscriptionKey: ['chat', roomId, 'message-sent'],
    onReception: (_prev, event) => {
      void queryClient.invalidateQueries({
        queryKey: ['chat', event.roomId, 'messages'],
      })
      return event
    },
  })

  useSockAsQuery<
    unknown,
    { from: string; to: string },
    { from: string; to: string }
  >({
    subscriptionKey: ['chat', 'users', 'renamed'],
    onReception: (_prev, event) => {
      void queryClient.invalidateQueries({ queryKey: ['chat'] })
      return event
    },
  })

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isListening ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {isListening ? 'live' : 'connecting...'}
    </span>
  )
}
```

---

### Task 9: Rewrite `UserRename.tsx` — collapsible form in sidebar footer

**Files:**

- Modify: `examples/react/src/components/UserRename.tsx`

- [ ] **Step 1: Replace UserRename.tsx**

```tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

interface Props {
  author: string
  onRenamed: (newName: string) => void
}

export function UserRename({ author, onRenamed }: Props) {
  const [newName, setNewName] = useState('')
  const [open, setOpen] = useState(false)

  const { mutate: rename, isPending } = useMutation({
    mutationFn: (vars: { from: string; to: string }) =>
      fetch('/api/users/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }).then((r) => r.json()),
    onSuccess: () => {
      onRenamed(newName.trim())
      setNewName('')
      setOpen(false)
    },
  })

  const handleRename = () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === author) return
    rename({ from: author, to: trimmed })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors"
      >
        Change name
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      <input
        autoFocus
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleRename()
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="New name..."
        className="w-full px-2 py-1 text-xs rounded bg-gray-800 text-gray-100 border border-gray-600 focus:outline-none focus:border-blue-500"
      />
      <div className="flex gap-1">
        <button
          onClick={handleRename}
          disabled={isPending || !newName.trim()}
          className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded py-1 transition"
        >
          {isPending ? '...' : 'OK'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded py-1 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

---

### Task 10: Build `@sockas-query/react` and verify TypeScript compiles

**Files:**

- No changes — verification only

- [ ] **Step 1: Build the React package**

```bash
cd /Users/long-lazuli/Projects/sources/long-lazuli/react-query-socket-adapter
pnpm --filter @sockas-query/react build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: TypeScript check on the example**

```bash
cd /Users/long-lazuli/Projects/sources/long-lazuli/react-query-socket-adapter/examples/react
npx tsc --noEmit 2>&1
```

Expected: no type errors. If errors appear, fix them in the relevant component file and re-run.

---

### Task 11: Commit

**Files:**

- All modified/created files above

- [ ] **Step 1: Stage all changes**

```bash
cd /Users/long-lazuli/Projects/sources/long-lazuli/react-query-socket-adapter
git add -A
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: redesign chat example UI with Tailwind — sidebar, message bubbles, TQ chat style"
```

- [ ] **Step 3: Push**

```bash
git push
```
