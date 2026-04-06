# Agent Instructions — sockas-query

## Documentation — REQUIRED on every task

Every task that implements or modifies a public API **must** update the relevant docs.
Docs live in `docs/` and mirror TanStack Query's structure at `externals/tanstack-query/docs/`.

### Structure

```
docs/
  framework/
    react/
      guides/          ← narrative how-to guides (how subscriptions work, key sharing, etc.)
      reference/       ← one file per public hook/component (useSockAsQuery.md, etc.)
  reference/           ← framework-agnostic core API (SubscriptionManager, types, etc.)
```

### Format

Mirror TanStack Query's doc format exactly.

**Reference doc** (`docs/framework/react/reference/useSockAsQuery.md`):

```md
---
id: useSockAsQuery
title: useSockAsQuery
---

\`\`\`tsx
const {
data,
isListening,
error,
status,
} = useSockAsQuery({
subscriptionKey,
onReception,
subscribe,
enabled,
initialData,
select,
})
\`\`\`

## Options

- `subscriptionKey: readonly unknown[]`
  - Required. First segment must be a socket name registered in `SockasProvider`.
  - Doubles as the TanStack Query cache key.
  - ...

## Returns

- `data: TData | undefined`
  - ...
```

**Guide doc** (`docs/framework/react/guides/subscriptions.md`):

```md
---
id: subscriptions
title: Subscriptions
---

## Subscription Basics

A subscription is a declarative dependency on a real-time socket event...
```

### Rules

1. **New hook or component** → create a reference doc in `docs/framework/react/reference/`
2. **New concept or pattern** → create or update a guide in `docs/framework/react/guides/`
3. **Core/framework-agnostic API** → document in `docs/reference/`
4. **Modified behavior** → update the relevant existing doc
5. **Docs commit must be part of the same commit as the implementation**, not a separate PR

### What "complete" means

A task is NOT done until:

- [ ] Implementation passes tests
- [ ] Relevant docs are written or updated
- [ ] `pnpm test:lib && pnpm test:types` pass

## Project structure

```
externals/tanstack-query/    ← git submodule, source as documentation — never modify
packages/
  sockas-query-core/         ← framework-agnostic core (mirrors tanstack/query-core)
    src/
    src/__tests__/
  react-sockas-query/        ← React bindings (mirrors tanstack/react-query)
    src/
    src/__tests__/
examples/react/              ← React example app
docs/                        ← documentation (you maintain this)
```

## Package names

- Core (framework-agnostic): `@sockas/query-core` (in `packages/sockas-query-core/`)
- React bindings: `@sockas/react-query` (in `packages/react-sockas-query/`)

## What goes where

- **`sockas-query-core`**: `SubscriptionManager`, pure types, framework-agnostic logic — no React imports
- **`react-sockas-query`**: `SockasProvider`, `useSockAsQuery`, `useSockAsMutation` — depends on `@sockas/query-core`

This mirrors TanStack Query's own `query-core` / `react-query` split exactly.

## Tech stack

- pnpm workspaces
- TypeScript (strict, exactOptionalPropertyTypes)
- Vitest + @testing-library/react
- tsup for build
- TanStack Query public API only — no internals

## Coding conventions

- Follow TanStack Query's patterns (see `externals/tanstack-query/packages/react-query/src/`)
- `ReadonlyArray<unknown>` not `readonly unknown[]` (eslint rule)
- American English spelling (cspell enforced)
- All tests run inside real `QueryClientProvider` + `SockasProvider`
