import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSockAsMutation } from '@sockas-query/react'
import { socket } from '../socket'

type Room = { id: string; name: string }

interface Props {
  roomId: string
  onRoomChange: (id: string) => void
}

export function RoomSelector({ roomId, onRoomChange }: Props) {
  const queryClient = useQueryClient()

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => fetch('/api/rooms').then((r) => r.json()),
  })

  const { send: joinRoom } = useSockAsMutation<
    typeof socket,
    { newRoomId: string },
    void
  >({
    socketName: 'chat',
    emit: (sock, { newRoomId }) => {
      sock.emit('join-room', { newRoomId })
    },
    onSuccess: (_data, { newRoomId }) => {
      onRoomChange(newRoomId)
      void queryClient.invalidateQueries({
        queryKey: ['chat', newRoomId, 'messages'],
      })
    },
  })

  return (
    <ul className="space-y-0.5">
      {rooms.map((room) => (
        <li key={room.id}>
          <button
            onClick={() => joinRoom({ newRoomId: room.id })}
            disabled={room.id === roomId}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
              room.id === roomId
                ? 'bg-gray-700 text-white font-semibold'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            # {room.id}
          </button>
        </li>
      ))}
    </ul>
  )
}
