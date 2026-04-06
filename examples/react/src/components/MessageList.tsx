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
