# frontend — working notes

Demo SPA for the Joke API. See `README.md` for what it is and how to run it;
this file is the stuff that is easy to get wrong.

## Commands

```bash
pnpm dev            # http://localhost:5173, regenerates the client first
pnpm generate       # orval + tsr generate — run after editing the OpenAPI spec
pnpm verify         # generate + prettier --check + eslint + tsc + vitest
pnpm format         # prettier --write + eslint --fix
```

`mise run //frontend:verify` and `//frontend:pre-commit` are the monorepo-level
entry points.

## Conventions

- **Never hand-write an HTTP call.** Everything goes through the generated
  orval client. To change the API surface, change
  `backend/src/main/resources/api/openapi.yaml` and re-run `pnpm generate`.
- **`src/features/jokes/api.ts` is the only importer of
  `#/generated/api/jokes`** — an ESLint `no-restricted-imports` rule fails the
  build otherwise. Add a wrapper there rather than an exception here.
- **Model types from `#/generated/api/model` are fine anywhere.** They are the
  contract, not the transport.
- **Errors are `ApiError`.** The mutator throws it on every non-2xx with the
  RFC 9457 problem body parsed onto it. Screens render
  `jokeErrorMessage(error)` rather than composing their own copy.
- **URL state over component state when it is worth sharing.** The catalogue's
  filter and page go through `jokeSearchSchema` in `validateSearch`; the random
  page's category does not, because a random joke's URL is not worth sharing.
- **Path alias is `#/`,** mapped to `src/` in both `tsconfig.json` and
  `package.json` `imports`.
- **shadcn primitives in `src/components/ui/` are vendored, not written.** Add
  with `pnpm dlx shadcn@latest add <name>`, then `pnpm format` — the generated
  files do not match this project's prettier config out of the box.

## Things that will bite

- **`src/generated/` and `src/routeTree.gen.ts` are git-ignored.** A bare
  `tsc --noEmit` on a fresh clone fails until `pnpm generate` has run; that is
  why `verify` runs it first.
- **Validation bounds are duplicated.** `create-joke-form.tsx` mirrors the
  spec's 3–500 character limit because generated types carry the shape but not
  the constraints. If the spec's bounds move, move them there too.
- **Devtools are stripped in production and under vitest.** `SHOW_DEVTOOLS` in
  `__root.tsx` — the devtools' unmount path throws in jsdom and takes any
  render test with it.
- **`VITE_API_BASE_URL` is baked in at build time.** Changing the backend URL
  means a rebuild and a re-upload — `dist/` is environment-specific, and there
  is no runtime configuration to change.
- **`dist/` is served by a bucket, not a web server.** SPA fallback and cache
  headers are bucket/upload settings, not something this app can control — see
  the deployment section of `README.md` before assuming a redirect or a header
  will be there.
