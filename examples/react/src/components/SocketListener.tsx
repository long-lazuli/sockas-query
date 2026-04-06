import { useQueryClient } from '@tanstack/react-query'
import { useSockAsQuery } from '@sockas/react-query'

interface Props {
  roomId: string
}

// Pattern 1: listens to '{roomId}:message-sent' events.
// When received, invalidates the useQuery for messages → MessageList refetches.
// Shared key namespace: subscriptionKey[0] === 'chat' === socket name.
// Factory maps ['chat', roomId, 'message-sent'] → event `roomId + ':' + 'message-sent'`
// e.g. ['chat', 'general', 'message-sent'] → 'general:message-sent'
export function SocketListener({ roomId }: Props) {
  const queryClient = useQueryClient()

  const { isListening } = useSockAsQuery<
    unknown,
    { roomId: string },
    { roomId: string }
  >({
    subscriptionKey: ['chat', roomId, 'message-sent'],
    onReception: (_prev, event) => {
      // Invalidate the message list — triggers MessageList to refetch
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
