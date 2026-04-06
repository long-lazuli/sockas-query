import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

interface Props {
  author: string
  onRenamed: (newName: string) => void
}

export function UserRename({ author, onRenamed }: Props) {
  const [newName, setNewName] = useState('')

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
    },
  })

  const handleRename = () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === author) return
    rename({ from: author, to: trimmed })
  }

  return (
    <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
      <input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
        placeholder={`Rename "${author}" to...`}
        disabled={isPending}
        style={{
          fontFamily: 'monospace',
          padding: '0.2rem 0.4rem',
          marginRight: '0.4rem',
        }}
      />
      <button onClick={handleRename} disabled={isPending || !newName.trim()}>
        {isPending ? 'Renaming...' : 'Rename'}
      </button>
      <span style={{ color: '#aaa', marginLeft: '0.5rem' }}>
        (server renames in all rooms, all clients refresh)
      </span>
    </div>
  )
}
