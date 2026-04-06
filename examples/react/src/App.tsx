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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-56 bg-gray-900 text-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-bold text-lg">sockas-query</h1>
          <p className="text-xs text-gray-400 mt-1">chat demo</p>
        </div>

        {/* Rooms */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1">
            Rooms
          </p>
          <RoomSelector roomId={roomId} onRoomChange={setRoomId} />
        </div>

        {/* Identity */}
        <div className="p-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Chatting as</p>
          <p className="text-sm font-semibold truncate">{author}</p>
          <UserRename author={author} onRenamed={setAuthor} />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 bg-white border-b flex items-center justify-between px-4 shadow-sm">
          <span className="font-semibold text-gray-700">#{roomId}</span>
          <SocketListener roomId={roomId} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList roomId={roomId} author={author} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-3">
          <MessageInput roomId={roomId} author={author} />
        </div>
      </div>
    </div>
  )
}
