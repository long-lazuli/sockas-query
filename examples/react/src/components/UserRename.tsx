import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

interface Props {
  author: string
  onRenamed: (newName: string) => void
}

export function UserRename({ author, onRenamed }: Props) {
  const [newName, setNewName] = useState('')
  const [open, setOpen] = useState(false)

  const { mutate: rename, isPending } = useMutation({
    mutationFn: (vars: { from: string; to: string }) =>
      fetch('/api/users/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }).then((r) => r.json()),
    onSuccess: () => {
      onRenamed(newName.trim())
      setNewName('')
      setOpen(false)
    },
  })

  const handleRename = () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === author) return
    rename({ from: author, to: trimmed })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors"
      >
        Change name
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      <input
        autoFocus
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleRename()
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="New name..."
        className="w-full px-2 py-1 text-xs rounded bg-gray-800 text-gray-100 border border-gray-600 focus:outline-none focus:border-blue-500"
      />
      <div className="flex gap-1">
        <button
          onClick={handleRename}
          disabled={isPending || !newName.trim()}
          className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded py-1 transition"
        >
          {isPending ? '...' : 'OK'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded py-1 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
