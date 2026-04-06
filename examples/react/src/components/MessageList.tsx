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
