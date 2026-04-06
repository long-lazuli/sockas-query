import { useState } from 'react'
import { useSockAsMutation } from '@sockas-query/react'
import { socket } from '../socket'

interface Props {
  roomId: string
  author: string
}

export function MessageInput({ roomId, author }: Props) {
  const [text, setText] = useState('')

  // Pattern 1: fire-and-forget — server confirms via socket event, not via ack
  const { send, isPending } = useSockAsMutation<
    typeof socket,
    { text: string },
    void
  >({
    socketName: 'chat',
    emit: (sock, { text: messageText }) => {
      sock.emit('send-message', { roomId, author, text: messageText })
      // void — fire-and-forget, no Promise returned
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
