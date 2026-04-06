# Chat Room Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully-runnable real-time chat room example that demonstrates `useQuery`, `useSockAsQuery`, and `useSockAsMutation` patterns with two browser windows communicating via Socket.io.

**Architecture:** Node.js/Express/Socket.io server with in-memory store exposes REST endpoints for rooms/messages and a socket event bus for real-time delivery. A Vite+React frontend uses `@sockas/react-query` hooks wired to the socket. Three patterns are showcased: `useQuery` for HTTP fetch, `useSockAsMutation` fire-and-forget for sending messages, and `useSockAsMutation` with `onSuccess` for room switching.

**Tech Stack:** Node.js, Express, Socket.io, tsx, Vite, React 19, @tanstack/react-query, @sockas/react-query, socket.io-client, pnpm workspaces

---

### Task 1: Create server package

**Files:**

- Create: `examples/server/package.json`
- Create: `examples/server/server.ts`

- [ ] **Step 1: Create `examples/server/package.json`**

```json
{
  "name": "sockas-query-chat-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.0",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "~5.6.2"
  }
}
```

- [ ] **Step 2: Create `examples/server/server.ts`**

Note: Server emits `${payload.roomId}:message-sent` (room-scoped event) so the frontend factory mapping `key.slice(1).join(':')` resolves correctly.

```ts
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

type Message = { id: string; author: string; text: string; at: string }
type Room = { id: string; name: string }

const rooms: Room[] = [
  { id: 'general', name: '# general' },
  { id: 'random', name: '# random' },
  { id: 'tech', name: '# tech' },
]

const messages: Record<string, Message[]> = {
  general: [
    {
      id: '1',
      author: 'alice',
      text: 'hey everyone 👋',
      at: new Date().toISOString(),
    },
  ],
  random: [],
  tech: [
    {
      id: '2',
      author: 'bob',
      text: 'anyone tried sockas-query?',
      at: new Date().toISOString(),
    },
  ],
}

app.get('/rooms', (_req, res) => {
  res.json(rooms)
})

app.get('/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params
  setTimeout(() => {
    res.json(messages[roomId] ?? [])
  }, 300)
})

io.on('connection', (socket) => {
  console.log('client connected:', socket.id)

  socket.on(
    'send-message',
    (payload: { roomId: string; author: string; text: string }) => {
      const msg: Message = {
        id: Math.random().toString(36).slice(2),
        author: payload.author,
        text: payload.text,
        at: new Date().toISOString(),
      }
      messages[payload.roomId] = [...(messages[payload.roomId] ?? []), msg]
      io.emit(`${payload.roomId}:message-sent`, { roomId: payload.roomId })
      console.log(`message in ${payload.roomId}:`, msg.text)
    },
  )

  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`chat server running at http://localhost:${PORT}`)
})
```

- [ ] **Step 3: Install server dependencies from repo root**

```bash
pnpm install
```

Expected: pnpm resolves workspace and installs all packages including new server deps.

---

### Task 2: Update React app — add socket.io-client and vite proxy

**Files:**

- Modify: `examples/react/package.json`
- Modify: `examples/react/vite.config.ts`

- [ ] **Step 1: Add `socket.io-client` to `examples/react/package.json`**

Update dependencies to add `"socket.io-client": "^4.7.0"` and devDependencies to add `"@types/node": "^20.0.0"`:

```json
{
  "name": "react-sockas-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite --preview"
  },
  "dependencies": {
    "@sockas/react-query": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.6.2",
    "vite": "^6.0.5"
  }
}
```

- [ ] **Step 2: Update `examples/react/vite.config.ts` to add proxy**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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

- [ ] **Step 3: Run `pnpm install` from repo root to pick up new dep**

```bash
pnpm install
```

---

### Task 3: Create React app source files

**Files:**

- Create: `examples/react/src/socket.ts`
- Modify: `examples/react/src/main.tsx`
- Create: `examples/react/src/App.tsx`
- Create: `examples/react/src/components/RoomSelector.tsx`
- Create: `examples/react/src/components/SocketListener.tsx`
- Create: `examples/react/src/components/MessageList.tsx`
- Create: `examples/react/src/components/MessageInput.tsx`

- [ ] **Step 1: Create `examples/react/src/socket.ts`**

```ts
import { io } from 'socket.io-client'

export const socket = io('http://localhost:3001', {
  autoConnect: true,
})
```

- [ ] **Step 2: Replace `examples/react/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SockasProvider } from '@sockas/react-query'
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

- [ ] **Step 3: Create `examples/react/src/App.tsx`**

```tsx
import { useState } from 'react'
import { RoomSelector } from './components/RoomSelector'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { SocketListener } from './components/SocketListener'

export default function App() {
  const [roomId, setRoomId] = useState('general')
  const [author] = useState(
    () => `user-${Math.random().toString(36).slice(2, 6)}`,
  )

  return (
    <div
      style={{
        fontFamily: 'monospace',
        maxWidth: 640,
        margin: '2rem auto',
        padding: '0 1rem',
      }}
    >
      <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        sockas-query chat demo
      </h1>

      <div style={{ marginBottom: '0.5rem' }}>
        <label>
          Your name:{' '}
          <input
            value={author}
            readOnly
            style={{ fontFamily: 'monospace', padding: '0.2rem 0.4rem' }}
          />
        </label>
      </div>

      <RoomSelector roomId={roomId} onRoomChange={setRoomId} />
      <SocketListener roomId={roomId} />
      <MessageList roomId={roomId} />
      <MessageInput roomId={roomId} author={author} />
    </div>
  )
}
```

Note: `author` is read-only for simplicity (random name on load). The spec shows an editable input — we use `useState` with setter and make it editable per spec.

- [ ] **Step 4: Create `examples/react/src/components/` directory and RoomSelector.tsx**

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSockAsMutation } from '@sockas/react-query'
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

  const { send: joinRoom, isPending } = useSockAsMutation<
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
    <div style={{ marginBottom: '1rem' }}>
      <strong>Room: </strong>
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => joinRoom({ newRoomId: room.id })}
          disabled={isPending || room.id === roomId}
          style={{
            marginRight: '0.5rem',
            fontWeight: room.id === roomId ? 'bold' : 'normal',
            textDecoration: room.id === roomId ? 'underline' : 'none',
            cursor: room.id === roomId ? 'default' : 'pointer',
          }}
        >
          {room.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create `examples/react/src/components/SocketListener.tsx`**

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { useSockAsQuery } from '@sockas/react-query'

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

  return (
    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
      socket: {isListening ? '🟢 connected' : '🔴 connecting...'}
    </div>
  )
}
```

- [ ] **Step 6: Create `examples/react/src/components/MessageList.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query'

type Message = { id: string; author: string; text: string; at: string }

interface Props {
  roomId: string
}

export function MessageList({ roomId }: Props) {
  const { data: messages = [], isFetching } = useQuery<Message[]>({
    queryKey: ['chat', roomId, 'messages'],
    queryFn: () => fetch(`/api/rooms/${roomId}/messages`).then((r) => r.json()),
  })

  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: '0.5rem',
        minHeight: 200,
        maxHeight: 400,
        overflowY: 'auto',
        marginBottom: '0.5rem',
        background: '#fafafa',
      }}
    >
      {isFetching && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#aaa',
            marginBottom: '0.25rem',
          }}
        >
          refreshing...
        </div>
      )}
      {messages.length === 0 && (
        <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
          No messages yet.
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} style={{ marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>
            {msg.author}:{' '}
          </span>
          <span>{msg.text}</span>
          <span
            style={{ fontSize: '0.7rem', color: '#aaa', marginLeft: '0.5rem' }}
          >
            {new Date(msg.at).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Create `examples/react/src/components/MessageInput.tsx`**

```tsx
import { useState } from 'react'
import { useSockAsMutation } from '@sockas/react-query'
import { socket } from '../socket'

interface Props {
  roomId: string
  author: string
}

export function MessageInput({ roomId, author }: Props) {
  const [text, setText] = useState('')

  const { send, isPending } = useSockAsMutation<
    typeof socket,
    { text: string },
    void
  >({
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
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message... (Enter to send)"
        disabled={isPending}
        style={{
          flex: 1,
          fontFamily: 'monospace',
          padding: '0.4rem 0.6rem',
          fontSize: '0.9rem',
        }}
      />
      <button
        onClick={handleSend}
        disabled={isPending || !text.trim()}
        style={{ padding: '0.4rem 1rem' }}
      >
        Send
      </button>
    </div>
  )
}
```

---

### Task 4: Update App.tsx to use editable author name (per spec)

The spec shows author as editable. Update App.tsx to use `useState` with setter.

**Files:**

- Modify: `examples/react/src/App.tsx`

- [ ] **Step 1: Update App.tsx with editable author input**

Replace the read-only author input with:

```tsx
import { useState } from 'react'
import { RoomSelector } from './components/RoomSelector'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { SocketListener } from './components/SocketListener'

export default function App() {
  const [roomId, setRoomId] = useState('general')
  const [author, setAuthor] = useState(
    () => `user-${Math.random().toString(36).slice(2, 6)}`,
  )

  return (
    <div
      style={{
        fontFamily: 'monospace',
        maxWidth: 640,
        margin: '2rem auto',
        padding: '0 1rem',
      }}
    >
      <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        sockas-query chat demo
      </h1>

      <div style={{ marginBottom: '0.5rem' }}>
        <label>
          Your name:{' '}
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            style={{ fontFamily: 'monospace', padding: '0.2rem 0.4rem' }}
          />
        </label>
      </div>

      <RoomSelector roomId={roomId} onRoomChange={setRoomId} />
      <SocketListener roomId={roomId} />
      <MessageList roomId={roomId} />
      <MessageInput roomId={roomId} author={author} />
    </div>
  )
}
```

---

### Task 5: Create example README

**Files:**

- Create: `examples/react/README.md`

- [ ] **Step 1: Create README**

```md
# sockas-query chat example

Demonstrates:

1. `useQuery` — fetches message list via HTTP
2. `useSockAsMutation` fire-and-forget — sends message via socket; server confirms via socket event; `useSockAsQuery` invalidates message list (shared key namespace)
3. `useSockAsMutation` + `onSuccess` — changes room; explicitly invalidates new room's message query

## Running

**Terminal 1 — server:**
\`\`\`bash
cd examples/server
pnpm install
pnpm dev
\`\`\`

**Terminal 2 — frontend:**
\`\`\`bash
cd examples/react
pnpm dev
\`\`\`

Open http://localhost:5173 in two browser windows and chat.
```

---

### Task 6: Verify and commit

- [ ] **Step 1: Start server in background and run smoke tests**

```bash
cd examples/server && pnpm dev &
sleep 3
curl -s http://localhost:3001/rooms
curl -s http://localhost:3001/rooms/general/messages
kill %1
```

Expected: Both return JSON arrays.

- [ ] **Step 2: Run existing tests to ensure nothing is broken**

```bash
pnpm test:lib && pnpm test:types
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add examples/
git commit -m "feat: add real-time chat example — two browsers, full interop demo"
```
