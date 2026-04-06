# Contributing to sockas-query

## Structure

This monorepo is designed so `packages/react-sockas-query` could be dropped into the TanStack Query monorepo as a `packages/` entry with minimal friction.

Conventions mirrored from TanStack Query:

- Same toolchain: pnpm, tsup, vitest, changesets
- Same script names: `test:lib`, `test:types`, `test:eslint`, `build`, `clean`, `compile`
- Same package structure: `src/`, `src/__tests__/`
- Same test style: vitest + @testing-library/react, real `QueryClientProvider` + `SockasProvider` in every test
- Public API only — no TanStack Query internals used or modified

## TanStack Query submodule

`externals/tanstack-query` is a git submodule pointing to https://github.com/tanstack/query.
Use it as living documentation — never modify it.

To update:

```bash
git submodule update --remote externals/tanstack-query
```

## Running tests

From the repo root:

```bash
pnpm test:lib     # all packages
pnpm test:types   # type check all packages
```

From a specific package:

```bash
cd packages/react-sockas-query && pnpm test:lib
cd packages/sockas-query-core && pnpm test:lib
```

## Documentation

Every PR that adds or modifies a public API must update `docs/`.
See `AGENTS.md` for the full documentation requirements.
