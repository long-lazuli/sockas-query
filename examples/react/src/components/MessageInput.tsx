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
