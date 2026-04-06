import { useQueryClient } from '@tanstack/react-query'
import { useSockAsQuery } from '@sockas-query/react'

interface Props {
  roomId: string
}

export function SocketListener({ roomId }: Props) {
  const queryClient = useQueryClient()

  // Room-scoped: listens for new messages in current room
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

  // Global: listens for username renames — invalidates all chat cache
  // TanStack Query refetches only the currently active room query
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
    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
      socket: {isListening ? '🟢 connected' : '🔴 connecting...'}
    </div>
  )
}
