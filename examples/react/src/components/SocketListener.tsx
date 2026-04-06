import { useQueryClient } from '@tanstack/react-query'
import { useSockAsQuery } from '@sockas-query/react'

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
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isListening ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {isListening ? 'live' : 'connecting...'}
    </span>
  )
}
