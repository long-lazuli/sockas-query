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
    <div
      style={{
        fontFamily: 'monospace',
        maxWidth: 640,
        margin: '2rem auto',
        padding: '0 1rem',
      }}
    >
      <h1 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
        sockas-query chat demo
      </h1>

      <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>
        Chatting as: <strong>{author}</strong>
      </div>

      <UserRename author={author} onRenamed={setAuthor} />

      <RoomSelector roomId={roomId} onRoomChange={setRoomId} />

      <SocketListener roomId={roomId} />

      <MessageList roomId={roomId} />

      <MessageInput roomId={roomId} author={author} />
    </div>
  )
}
