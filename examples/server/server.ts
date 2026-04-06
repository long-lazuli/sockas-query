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

// ── In-memory store ──────────────────────────────────────────────────────────

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

// ── REST endpoints ────────────────────────────────────────────────────────────

app.get('/rooms', (_req, res) => {
  res.json(rooms)
})

app.get('/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params
  // Simulate a small delay so loading states are visible
  setTimeout(() => {
    res.json(messages[roomId] ?? [])
  }, 300)
})

// ── Socket.io ─────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('client connected:', socket.id)

  // Client sends a message (fire-and-forget — no ack)
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

      // Emit room-scoped event so the frontend factory mapping
      // key.slice(1).join(':') = e.g. 'general:message-sent' matches
      io.emit(`${payload.roomId}:message-sent`, { roomId: payload.roomId })
      console.log(`message in ${payload.roomId}:`, msg.text)
    },
  )

  socket.on('disconnect', () => {
    console.log('client disconnected:', socket.id)
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`chat server running at http://localhost:${PORT}`)
})
