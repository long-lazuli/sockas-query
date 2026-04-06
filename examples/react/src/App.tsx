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

      {/* Pattern 2: change room → onSuccess invalidates new room's messages */}
      <RoomSelector roomId={roomId} onRoomChange={setRoomId} />

      {/* Pattern 1: useSockAsQuery invalidates useQuery on socket event */}
      <SocketListener roomId={roomId} />

      {/* useQuery: fetches messages list */}
      <MessageList roomId={roomId} />

      {/* useSockAsMutation fire-and-forget */}
      <MessageInput roomId={roomId} author={author} />
    </div>
  )
}
