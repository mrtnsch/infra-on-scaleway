# Overview

## Infrastructure overview

OpenTofu + Terragrunt IaC on Scaleway. State lives in Scaleway Object Storage
(S3-compatible), region `fr-par`.

```
iac/
├── catalog/modules/         # Reusable OpenTofu modules
│   ├── shared_infra/        # State bucket, container registry, Edge Services plan
│   ├── backend/             # VPC, managed PostgreSQL, Joke API container
│   ├── frontend_deps/       # The SPA's Edge Services pipeline, applied first
│   └── frontend/            # Site bucket, CDN stages and custom domain
└── live/                    # Environment configs (one state file per folder)
    ├── root.hcl             # Shared backend, provider and versions config
    ├── shared/              # Shared infra (state bucket, registry, Edge plan)
    ├── dev/
    │   ├── backend/         # Joke API, dev environment
    │   ├── frontend-deps/   # The SPA's pipeline; gives the CNAME target
    │   └── frontend/        # Joke SPA, dev environment
    └── prod/
```

## Why these resources

- **Why Object Storage for state, not the PostgreSQL backend?**
  Scaleway's provider guide offers both. Object Storage is a bucket with no
  instance to run, patch or pay for, and since May 2026 it supports S3
  conditional writes — which is what state locking needs. The PostgreSQL
  backend means running an RDB instance purely to hold a lock.
- **Why `use_lockfile` instead of a lock table?**
  Locking is done with an `If-None-Match` conditional PUT of a `.tflock` object
  next to the state. There is no DynamoDB equivalent on Scaleway and none is
  needed. This is why OpenTofu is pinned to `>= 1.12` — the flag does not exist
  before it.
- **Why is the state bucket created by CLI and then imported?**
  Chicken-and-egg: the backend cannot store state in a bucket that does not
  exist yet. Creating it out-of-band once and importing it means the bucket is
  still described in code rather than being an unmanaged snowflake.
- **Why no ACL / public-access-block resource?**
  Scaleway buckets are private by default and there is no public-access-block
  equivalent to configure. Its absence is deliberate.
- **Why versioning + noncurrent expiry?**
  Versioning makes a corrupted apply recoverable. Every apply writes a new
  version of every state file, so without expiry the bucket grows and is billed
  forever.
- **Why Serverless Containers and not an Instance?**
  There is no VM to patch, HTTPS termination and rolling deploys come with the
  product, and it attaches straight to a Private Network to reach the database.
  A `min_scale` of 1 keeps one instance warm, so the JVM cold start never hits
  a request.
- **Why is the database private-endpoint-only?**
  `scaleway_rdb_instance` attaches to the environment's Private Network and
  declares no `load_balancer` block, so the API creates no public endpoint at
  all. Nothing is exposed that would then need an ACL to lock back down.
- **Why `enable_ipam` instead of a static `ip_net`?**
  Only an IPAM-managed endpoint is registered in VPC DNS and the dataplane. A
  static endpoint is not, and the provider warns it may be unreachable from
  other resources in the same VPC — including the container that needs it.
- **Why one VPC per environment?**
  Network isolation is the cheapest possible blast radius control: dev has no
  route to prod's database, by construction rather than by policy.
- **Why is the Hikari pool overridden from infra?**
  `application-prod.yaml` hardcodes 30 connections. Multiplied by `max_scale`
  that overruns a `db-dev-s`. `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE` uses
  Spring's relaxed binding to cap it per environment without a code change.
- **Why does the application connect as an admin database user?**
  Liquibase writes its changelog tables into the `public` schema — they cannot
  live in `jokes`, because that schema is created by the first changeset. On
  PostgreSQL 15+ a non-owner has no `CREATE` on `public`, and Scaleway's
  privilege grant is database-level, so it does not reliably cover it. Admin
  also avoids the documented privilege drift where the API reports `custom`
  once migrations create objects the grant predates.
- **Why are provider versions generated from `root.hcl`?**
  A `versions.tf` per module means the same pin repeated in every one of them,
  and eventually a module left behind on an old version. One `generate` block
  gives every unit the same requirements. The cost is that a module is no
  longer runnable with bare `tofu` — everything goes through Terragrunt.
- **Why is the registry shared rather than per-environment?**
  Promoting a build from dev to prod should mean deploying the same tag, not
  copying an image between namespaces.
- **Why a bucket website for the SPA and not a container?**
  `dist/` is static files, and a container would mean rebuilding an image on
  every content change. The cost is two gaps — deep links answer `404`, and no
  response header can be set — both documented in `frontend/README.md`. An
  nginx container is the escape hatch if either starts to matter.
- **Why Edge Services when the bucket already terminates TLS?**
  `s3-website.fr-par.scw.cloud` has a wildcard certificate of its own, so TLS is
  not the reason. Edge Services buys the cache and our own domain.
- **Why `is_website = true` on the backend stage?**
  It points Edge Services at the website endpoint rather than the S3 endpoint,
  which is what makes the error document — and so SPA fallback — apply to CDN
  traffic.
- **Why is the SPA's pipeline a separate unit (`frontend_deps`)?**
  A managed certificate is issued against the FQDN on the DNS stage, and the
  CNAME that FQDN needs points at the pipeline ID — unknowable before the
  pipeline exists. Splitting the pipeline into a unit applied first means the
  CNAME can be created before anything that depends on it, so both applies are
  expected to succeed rather than one converging out of a half-built state. The
  backend does it the other way because Scaleway documents
  `scaleway_container_domain` as retrying and leaving nothing behind; Edge
  Services makes no such promise.
- **Why is `edge_cname_target` derived from the pipeline ID rather than read
  from the API?** The DNS stage that would carry it does not exist yet when the
  value is needed. It is built against Scaleway's documented
  `<pipeline-id>.svc.edge.scw.cloud` format; compare it with `dev/frontend`'s
  `default_fqdn` afterwards.
- **Why does the Edge Services subscription live in `shared_infra`?**
  It is a project-wide billing relationship, not a per-pipeline resource.
  Starter covers one pipeline, so prod is an extra charge or an upgrade — and
  destroying `shared` cancels it for every pipeline.
- **Why does OpenTofu not upload `dist/`?**
  Filenames are content-hashed, so a resource per file would churn state on
  every build and still could not set two different `Cache-Control` values.
  `mise run //frontend:deploy` syncs instead, like `//backend:image` pushes.

## Why IaC + principles

- **Reproducibility** — infrastructure is version-controlled and reviewable in
  PRs, not clicked together in a console.
- **Separate state per environment** — each `live/` folder has its own state
  file. A bad apply in dev can never touch prod.
- **Modules for reuse, live folders for config** — `catalog/modules/` holds
  logic, `live/` holds only environment-specific values.
- **Secrets never in code** — credentials come from `.env.local` (gitignored).

## Development setup

### Installing tools

```bash
mise install
```

### Credentials

Create an API key at https://console.scaleway.com/iam/api-keys, then:

```bash
cp .env.local.example .env.local   # fill in the four values
```

mise mirrors `SCW_ACCESS_KEY`/`SCW_SECRET_KEY` into `AWS_ACCESS_KEY_ID`/
`AWS_SECRET_ACCESS_KEY`, because the s3 backend only reads the AWS names while
the Scaleway provider only reads the `SCW_` ones.

## Bootstrapping the state bucket

Run once. Bucket names share a global namespace per region, so pick a free one
and keep it in sync with `live/root.hcl` and `live/shared/terragrunt.hcl`.

```bash
scw object bucket create infra-on-scaleway-tfstate enable-versioning=true region=fr-par

cd iac/live/shared
terragrunt init
terragrunt import scaleway_object_bucket.tfstate fr-par/infra-on-scaleway-tfstate
terragrunt plan     # should show only the lifecycle rules as additions
terragrunt apply
```

## Deploying the backend

The container cannot start until its image is in the registry, so the registry
must exist and be populated first.

```bash
mise run //iac:plan:shared
mise run //iac:apply:shared                  # creates the registry namespace

cd iac/live/shared && terragrunt output registry_endpoint
                                             # rg.fr-par.scw.cloud/<namespace>
scw registry login
cd backend
docker build -t <endpoint>/joke-api:0.0.1 .
docker push <endpoint>/joke-api:0.0.1

mise run //iac:plan:dev-backend              # review before the first apply
mise run //iac:apply:dev-backend             # ~10 min, the database dominates
```

`plan:dev-backend` fails until `shared` has been applied — it reads `registry_endpoint`
off that unit's state, and the output does not exist before then. That is the
ordering, not a fault.

### Custom domain

`custom_hostname` binds a domain to the container. The CNAME has to point at the
container's generated endpoint, which does not exist until the container does,
so **the first apply is expected to fail on the domain** — everything else is
created, and the binding is the last thing attempted:

```bash
mise run //iac:apply:dev-backend             # fails on scaleway_container_domain

cd iac/live/dev/backend && terragrunt output container_cname_target
# at your registrar: CNAME jokes-api -> that value, TTL 300
dig jokes-api.martinschwarz.dev @1.1.1.1     # must resolve before continuing

mise run //iac:apply:dev-backend             # binds the domain, issues the cert
```

That failure is clean. While the API answers `could not validate domain` the
provider retries `CreateDomain` every 5 seconds for 10 minutes and then gives
up, so nothing is left half-created — no binding in Scaleway, none in state. The
cost is that the first apply stalls for those 10 minutes rather than failing
immediately. Adding the CNAME while it is still retrying lets it finish in one
apply.

Once the record resolves, Scaleway runs a Let's Encrypt HTTP-01 challenge with a
3 minute budget and marks the domain `error` if it fails. Use a subdomain — a
root domain needs CNAME flattening or an ALIAS record — set the low TTL *before*
creating the record so a stale negative cache cannot outlast the retries, and
make sure any `CAA` record on the zone allows `letsencrypt.org`.

Subsequent deploys: push a new tag, bump `image_tag` in
`live/dev/backend/terragrunt.hcl`, `terragrunt apply`.

`prod` becomes a copy of `live/dev/backend/terragrunt.hcl` with
`environment = "prod"`, a non-dev `db_node_type` and `db_ha = true`.

## Deploying the frontend

The SPA is static files in a bucket behind an Edge Services pipeline. The
subscription it bills against lives in `shared`, and the pipeline is its own
unit so its ID — which is the CNAME target — exists before anything needs it.

```bash
mise run //iac:apply:shared                  # Edge Services subscription
mise run //iac:apply:dev-frontend-deps       # the pipeline, nothing else

cd iac/live/dev/frontend-deps && terragrunt output -raw edge_cname_target
# at your registrar: CNAME jokes -> that value, TTL 300
dig jokes.martinschwarz.dev @1.1.1.1         # must resolve before continuing

mise run //iac:apply:dev-frontend            # bucket, CDN stages, certificate
mise run //frontend:deploy                   # pnpm build + upload
```

Unlike the backend's domain, no apply here is expected to fail: everything that
needs DNS is in `dev/frontend`, applied only once DNS answers. `dev/frontend`
reads the pipeline off `dev/frontend-deps`' state, so — like `dev/backend` and
`shared` — it cannot even plan until that unit is applied. The usual DNS
constraints still hold: set the low TTL before creating the record, and allow
`letsencrypt.org` in any `CAA` record on the zone.

Only the pipeline lives in `frontend_deps`, and that is a hard limit rather than
a choice. Certificate issuance is lazy — a TLS stage created with
`managed_certificate = true` and no FQDN anywhere returns instantly with an
empty `certificate_expires_at` — so on that count the TLS stage could sit with
the pipeline. What stops it is that **every stage must name the next one toward
the origin**: an unlinked TLS stage makes `scaleway_edge_services_head_stage`
fail with `next stage missing`, and Scaleway then refuses to delete that stage
while the DNS stage still points at it (a bare HTTP 500). Since the next stage
is the cache stage, and that needs the bucket, the TLS stage belongs in
`dev/frontend`. `dev/frontend`
reads the pipeline off `dev/frontend-deps`' state, so — like `dev/backend` and
`shared` — it cannot even plan until that unit is applied. The usual DNS
constraints still hold: set the low TTL before creating the record, and allow
`letsencrypt.org` in any `CAA` record on the zone.

Afterwards, check `edge_cname_target` against `dev/frontend`'s `default_fqdn`:
the former is a string built from the pipeline ID, and only that comparison
proves the format still holds. It follows that **replacing the pipeline is a DNS
change** — a new pipeline means a new CNAME target.

`deploy` reads the site bucket and the backend's endpoint from the live units'
outputs, so the API origin baked into the bundle — and with it the CSP's
`connect-src` — is never copied by hand. It uploads hashed assets `immutable`,
then `index.html` `no-store`; caching directives override the pipeline's
`fallback_ttl`, so no purge is needed between deploys.

Subsequent deploys are `mise run //frontend:deploy` alone. The backend is not
involved: `CORS_ALLOWED_ORIGINS` already names `https://jokes.martinschwarz.dev`.

`prod` becomes a copy of both frontend units with its own `bucket_name`, plus a
second pipeline — which the Starter plan does not cover.

## Everyday tasks

### Preview and apply changes

One task per unit:

```bash
mise run //iac:plan:shared
mise run //iac:apply:dev-backend
```

Or the generic pair, which takes any unit path under `live/` — this is what a
new environment uses before it earns a shortcut:

```bash
mise run //iac:plan  prod/backend
mise run //iac:apply prod/backend
```

Across all units:

```bash
cd iac/live
terragrunt run --all plan
```

Always run `plan` first and review the output before applying — `apply` creates
billable resources.

### Formatting

```bash
mise run //iac:fmt
```

### Unlock state

If a run dies mid-apply the `.tflock` object is left behind:

```bash
terragrunt force-unlock <LOCK_ID>
```

The lock ID is printed in the error message.
