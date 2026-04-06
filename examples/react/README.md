# sockas-query chat example

Demonstrates:

1. `useQuery` — fetches message list via HTTP
2. `useSockAsMutation` fire-and-forget — sends message via socket; server confirms via socket event; `useSockAsQuery` invalidates message list (shared key namespace)
3. `useSockAsMutation` + `onSuccess` — changes room; explicitly invalidates new room's message query

## Running

**Terminal 1 — server:**

```bash
cd examples/server
pnpm install
pnpm dev
```

**Terminal 2 — frontend:**

```bash
cd examples/react
pnpm dev
```

Open http://localhost:5173 in two browser windows and chat.
