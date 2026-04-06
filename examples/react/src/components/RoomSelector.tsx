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

  // Pattern 2: change room → onSuccess explicitly invalidates new room's messages
  const { send: joinRoom, isPending } = useSockAsMutation<
    typeof socket,
    { newRoomId: string },
    void
  >({
    socketName: 'chat',
    emit: (sock, { newRoomId }) => {
      // fire-and-forget join notification (server could use this for presence)
      sock.emit('join-room', { newRoomId })
    },
    onSuccess: (_data, { newRoomId }) => {
      onRoomChange(newRoomId)
      // Explicit invalidation — not shared-key, intentional refetch of new room
      void queryClient.invalidateQueries({
        queryKey: ['chat', newRoomId, 'messages'],
      })
    },
  })

  return (
    <div style={{ marginBottom: '1rem' }}>
      <strong>Room: </strong>
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => joinRoom({ newRoomId: room.id })}
          disabled={isPending || room.id === roomId}
          style={{
            marginRight: '0.5rem',
            fontWeight: room.id === roomId ? 'bold' : 'normal',
            textDecoration: room.id === roomId ? 'underline' : 'none',
            cursor: room.id === roomId ? 'default' : 'pointer',
          }}
        >
          {room.name}
        </button>
      ))}
    </div>
  )
}
