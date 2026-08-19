# frontend

The demo SPA for the Joke API. Browse the catalogue, draw a random joke, add
your own.

React 19 · Vite · TanStack Router (file-based) · TanStack Query · Tailwind 4 ·
shadcn/ui · orval · TypeScript.

## Running it

```bash
mise install       # node 24, pnpm 11
pnpm install
pnpm dev           # http://localhost:5173
pnpm verify        # orval + tsr + prettier + eslint + tsc + vitest — what CI runs
pnpm build         # production bundle into dist/
```

`pnpm dev` expects the backend on `http://localhost:8080` (`cd ../backend &&
./gradlew bootRun`). It is a cross-origin call, so **the backend must allow
`http://localhost:5173`** — without that every request fails as an opaque
network error rather than an HTTP status, and the UI can only report "could not
reach the joke service".

## The generated API client

There is no hand-written HTTP code. `src/generated/` is produced by orval from
`../backend/src/main/resources/api/openapi.yaml` — the backend's committed
spec, read straight off disk. Generation is offline and needs no running
backend, so the client cannot drift from the contract the backend ships; a diff
on that file in a backend PR is the signal that this app needs work.

The output is git-ignored, and `dev` / `build` / `verify` all regenerate it
first, so a fresh clone resolves. Same for `src/routeTree.gen.ts`.

```bash
pnpm generate      # orval + tsr generate
```

**`src/features/jokes/api.ts` is the only file allowed to import the generated
hooks**, enforced by an ESLint rule. It owns the two things no call site should
repeat: unwrapping the mutator's `{ status, data, headers }` envelope, and
correcting `TError` from the error _body_ to the `ApiError` the mutator
actually throws. Generated model _types_ may be imported anywhere.

## Layout

```
src/
├─ routes/           file-based routes; the file tree is the URL tree
├─ features/jokes/   everything joke-shaped — the API seam, labels, components
├─ components/       app shell, error/404 boundaries, ui/ (shadcn primitives)
├─ lib/              fetch mutator, ApiError, query client, cn(), theme
├─ env.ts            validated VITE_* vars
└─ generated/        orval output (git-ignored)
```

| Route        | Endpoint            | Notes                                                          |
| ------------ | ------------------- | -------------------------------------------------------------- |
| `/`          | `GET /jokes`        | Filter and page live in the URL — bookmarkable, Back works     |
| `/random`    | `GET /jokes/random` | Uncached (`staleTime: 0`); 404 is an empty state, not an error |
| `/new`       | `POST /jokes`       | 409 "already exists" surfaces next to the submit button        |
| `/jokes/$id` | `GET /jokes/{id}`   | The `Location` header target; 404 → the router's 404 screen    |

## Configuration

One variable, `VITE_API_BASE_URL`, validated at boot by `src/env.ts`. `VITE_*`
vars are inlined into the bundle at build time, which has one consequence worth
stating plainly: **the built `dist/` is environment-specific**. Repointing the
app at a different backend is a rebuild, not a setting.

Per-mode files (`.env.development`, `.env.production`, `.env.test`) are
committed — they hold public config only. Machine-local overrides go in
`.env.local`, which is git-ignored. Nothing secret belongs in any of them.

## Deployment

The build artifact is a directory of static files — `dist/` — served straight
out of an S3-compatible bucket (Scaleway Object Storage). There is no server, no
container and no runtime configuration.

```bash
mise run //frontend:deploy    # VITE_API_BASE_URL=<deployed backend> pnpm build, then upload
```

The task reads the bucket and the backend's endpoint from the `iac/` live units,
so no URL is copied by hand. `aws` uses `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`, which the repo-root `mise.toml` mirrors from `SCW_*`.

Two things the bucket has to be told, because there is no web server left to do
them:

**1. SPA fallback.** Every route below `/` is resolved by the client, so the
bucket's _error document_ must be `index.html` (the index document is
`index.html` too). Without it, reloading `/random` returns the bucket's own
404 page instead of the app. Note the honest limitation of static hosting: a
deep link is served with a `404` status even though the app renders correctly.
Neither this app nor the CDN in front of it can change that — see the security
headers note below.

**2. Cache headers.** Object metadata, set at upload time, and the two halves of
`dist/` want opposite answers: hashed assets cache forever because a deploy
renames them, while `index.html` points at those names and must never cache — a
stale copy pins a browser to the previous deploy. So: two passes, shell last.
`deploy` does both, and the CDN honours the directives over its own TTL, so no
purge is needed. The first pass syncs with `--delete`, so the previous deploy's
hashed assets vanish immediately — a tab that loaded the app before the deploy
can 404 on a lazy-loaded chunk until it reloads. Accepted, like the other gaps.

**3. Security headers.** The Content-Security-Policy travels _inside_
`index.html`, as a `<meta>` tag injected at build time by the `cspMeta` plugin
in `vite.config.ts` — a bucket cannot attach a custom response header, so the
document is the only delivery channel left. `connect-src` is derived from
`VITE_API_BASE_URL`, which is why an absolute URL is now required to build.

The policy is strict where it can be — `script-src 'self'` with no hash, nonce
or `'unsafe-inline'`, because the built `index.html` references one external
module and nothing else. `style-src` keeps `'unsafe-inline'`: React's `style`
prop and Radix's positioning both emit inline style _attributes_, which that
directive covers.

What a meta tag cannot do, **nothing on this hosting path can do either**:
Scaleway Edge Services has no header, rewrite or redirect capability in its API
at all. So these are absent, knowingly:

| Header                                       | Status                                                        |
| -------------------------------------------- | ------------------------------------------------------------- |
| `Content-Security-Policy: frame-ancestors …` | Present in the meta tag but **ignored** — the console says so |
| `X-Content-Type-Options: nosniff`            | Header-only, unavailable                                      |
| `Referrer-Policy: no-referrer`               | Header-only, unavailable                                      |
| `Strict-Transport-Security`                  | Header-only, unavailable                                      |

So the site is unprotected against framing. `vite.config.ts` writes the full
policy including `frame-ancestors`, so recovering these is a copy — but it needs
an origin that can set headers, i.e. `dist/` behind an nginx container. That is
the escape hatch, not a plan.

### Contract for the infra agent

- Artifact: the contents of `frontend/dist/`, produced by `pnpm build`. Nothing
  is built from this directory at deploy time.
- **`VITE_API_BASE_URL` is baked in at build time**, so the artifact is
  environment-specific: repointing the app at a different backend is a rebuild
  and a re-upload, not a config change.
- Bucket needs public read, index document `index.html`, **error document
  `index.html`**.
- Cache headers are the uploader's job — see above.
- A CSP ships inside `index.html`; `frame-ancestors` and the other header-only
  defences cannot be delivered on this hosting path at all. See above.
- The backend must allow the site's origin via CORS.
