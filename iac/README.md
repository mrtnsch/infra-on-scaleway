# Overview

## Infrastructure overview

OpenTofu + Terragrunt IaC on Scaleway. State lives in Scaleway Object Storage
(S3-compatible), region `fr-par`.

```
iac/
├── catalog/modules/         # Reusable OpenTofu modules
│   ├── shared_infra/        # State bucket, container registry, Edge Services plan
│   ├── backend/             # VPC, managed PostgreSQL, Joke API container
│   ├── frontend_deps/       # An Edge Services pipeline on its own, applied first
│   ├── frontend/            # Site bucket, CDN stages and custom domain
│   ├── kapsule/             # VPC, Kapsule cluster and pool, Load Balancer
│   ├── kapsule_db/          # The k8s runtime's own managed PostgreSQL
│   └── kapsule_edge/        # LB origin, WAF, cache, TLS and DNS stages
└── live/                    # Environment configs (one state file per folder)
    ├── root.hcl             # Shared backend, provider and versions config
    ├── shared/              # Shared infra (state bucket, registry, Edge plan)
    ├── dev/
    │   ├── backend/         # Joke API on Serverless Containers, dev environment
    │   ├── frontend-deps/   # The SPA's pipeline; gives the CNAME target
    │   ├── frontend/        # Joke SPA, dev environment
    │   ├── kapsule/         # Joke API on Kubernetes: cluster, node, LB
    │   ├── kapsule-db/      # Its database, on its own Private Network
    │   ├── kapsule-edge-deps/ # Its pipeline; gives the CNAME target
    │   └── kapsule-edge/    # Its WAF and CDN stages
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
- **Why client-side state encryption?**
  The state files hold every generated secret — both database passwords and
  the container's secret environment variables. `root.hcl` generates an
  `encryption` block that derives an AES-GCM key from `TF_VAR_state_passphrase`
  (pbkdf2), so the objects in the state bucket are ciphertext. The
  `unencrypted` fallback is what still reads state written before encryption
  was enabled; once every unit has rewritten its state (any apply does,
  `-refresh-only` is enough), remove the fallback so plaintext is refused.
  Losing the passphrase means losing the state.
- **Why a second runtime on Kapsule at all?**
  The Edge Services WAF stage only accepts Load Balancer and bucket origins, and
  a Serverless Container cannot back a Load Balancer. A WAF in front of the API
  therefore means a runtime that can sit behind one.
- **Why parallel rather than a migration?**
  `dev/backend` keeps serving `jokes-api.…` while the k8s runtime proves itself
  on `jokes-api-k8s.…`. DNS is the cutover lever, and the old runtime is the
  rollback — there is no state to roll back to.
- **Why does the k8s runtime share nothing with the backend module?**
  Own VPC, Private Network and database: zero coupling means zero risk to the
  running stack, and the two runtimes cannot reach each other's data by
  construction — the same one-VPC-per-environment reasoning, one level up. The
  price is a second db-dev-s and an empty database, so parity checks are
  functional rather than data-identical.
- **Why does OpenTofu create the Load Balancer instead of Kubernetes?**
  Because its ID has to be an ordinary unit output: `dev/kapsule-edge` reads
  `lb_id` from state like any other dependency, instead of someone pasting a
  value the cloud controller manager invented between two applies. The Service
  adopts the existing LB with the `scw-loadbalancer-id` annotation; without that
  annotation on the *first* apply the CCM creates — and bills — a second one.
- **Why is the LB's frontend a data source and not a resource?**
  Frontends, backends and ACLs are the CCM's half of the split, created when the
  Service is reconciled. Edge Services needs the frontend ID to know which port
  to hit, so `kapsule_edge` reads it back with `scaleway_lb_frontends`. That is
  also why this one unit cannot be planned before its dependencies exist: a
  mocked LB ID answers 404, and a `precondition` turns the missing frontend into
  "deploy the Service first" rather than an index error.
- **Why does `scaleway_lb` set `ssl_compatibility_level` and ignore `tags`?**
  Both are fields the CCM writes on the LB itself while reconciling. Stating the
  same SSL level OpenTofu would otherwise drift away from, and ignoring tags,
  keeps `plan` empty between deploys.
- **Why `delete_additional_resources = false` on the cluster?**
  `true` would have a cluster deletion take "additional" Load Balancers with it
  — including the one OpenTofu owns and deletes itself. There are no PVCs, so
  nothing else is left behind.
- **Why an image pull secret when the registry is in the same project?**
  Kapsule nodes carry no registry credentials of their own; Scaleway documents
  the pull secret as required even for a namespace in the same project. The
  deploy task creates it from `SCW_SECRET_KEY`, so it is never in git.
- **Why kubectl and kustomize rather than Argo CD or the Helm provider?**
  One app, one operator. `//backend:k8s-deploy` holds the line
  `//frontend:deploy` already draws: the IaC owns the cluster, the Load Balancer
  and the database, and never the workload. Driving Kubernetes from OpenTofu
  would put pod-level churn into infrastructure state; GitOps tooling stays
  additive later.
- **Why is the pipeline module named `frontend_deps` when the API uses it too?**
  It was always just "a pipeline on its own, applied first", and it now takes
  `name` and `description` instead of hardcoding the SPA's. Renaming the module
  would be cosmetic; renaming the *pipeline* would replace it, and a new
  pipeline ID is a new CNAME target.
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
cp .env.local.example .env.local   # fill in the five values
```

`TF_VAR_state_passphrase` is the state-encryption passphrase (16+ characters).
It is a secret like the API key — and unlike the key it is not replaceable:
without it the state cannot be decrypted.

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

`plan:dev-backend` plans before `shared` is applied only because the dependency
carries `mock_outputs` — such a plan shows a placeholder registry endpoint.
`apply` refuses the mock and needs the real output, so `shared` still goes
first.

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
reads the pipeline off `dev/frontend-deps`' state; `mock_outputs` let it plan
before that unit is applied, but the apply needs the real pipeline. The usual
DNS constraints still hold: set the low TTL before creating the record, and
allow `letsencrypt.org` in any `CAA` record on the zone.

Only the pipeline lives in `frontend_deps`, and that is a hard limit rather than
a choice. Certificate issuance is lazy — a TLS stage created with
`managed_certificate = true` and no FQDN anywhere returns instantly with an
empty `certificate_expires_at` — so on that count the TLS stage could sit with
the pipeline. What stops it is that **every stage must name the next one toward
the origin**: an unlinked TLS stage makes `scaleway_edge_services_head_stage`
fail with `next stage missing`, and Scaleway then refuses to delete that stage
while the DNS stage still points at it (a bare HTTP 500). Since the next stage
is the cache stage, and that needs the bucket, the TLS stage belongs in
`dev/frontend`.

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

## Deploying the Joke API on Kapsule

A second, fully self-contained runtime for the same API on Kubernetes Kapsule,
behind Edge Services with a WAF — alongside the serverless one, not replacing
it. `dev/backend` keeps serving `jokes-api.martinschwarz.dev`; this one serves
`jokes-api-k8s.martinschwarz.dev` and shares nothing with it: its own VPC,
Private Network, database, Edge Services pipeline.

```
client → jokes-api-k8s.… (CNAME) → Edge pipeline #2
       → DNS → TLS → cache → WAF → LB backend stage
       → Scaleway Load Balancer (OpenTofu-owned, adopted by the CCM)
       → Kapsule pool (1× DEV1-M) → joke-api pod
       → own Private Network → own dev PostgreSQL
```

Four units, in this order — the manifests go on in the middle, because the
Edge unit reads a Load Balancer frontend that only exists once the Service has
been reconciled:

```bash
mise run //iac:apply:dev-kapsule             # ~5 min: VPC, cluster, node, LB
mise run //iac:apply:dev-kapsule-db          # ~10 min, the database dominates
mise run //iac:apply:dev-kapsule-edge-deps   # the pipeline, nothing else

cd iac/live/dev/kapsule-edge-deps && terragrunt output -raw edge_cname_target
# at your registrar: CNAME jokes-api-k8s -> that value, TTL 300
dig jokes-api-k8s.martinschwarz.dev @1.1.1.1   # must resolve before continuing

mise run //backend:image 0.0.1               # if the tag is not pushed yet
mise run //backend:k8s-deploy 0.0.1          # cluster gets the workload

mise run //iac:apply:dev-kapsule-edge        # WAF, cache, TLS, DNS stages
curl https://jokes-api-k8s.martinschwarz.dev/jokes/random
```

`k8s-deploy` installs the kubeconfig (`scw k8s kubeconfig install`), creates the
two Secrets from unit outputs, points `k8s/kustomization.yaml` at the tag it was
given and applies. It never touches OpenTofu state — the same line
`//frontend:deploy` draws. The tag change it writes is meant to be committed:
it is this runtime's equivalent of `image_tag` in a `terragrunt.hcl`.

Manifests live in `backend/k8s/`, documented in `backend/k8s/README.md`.

### Hardening and parity

- **The WAF starts in `log_only`.** It classifies and logs without blocking,
  which is the only safe way to learn what paranoia level 1 does to real
  traffic. Watch the pipeline's logs in Cockpit, then set `waf_mode = "enable"`
  in `live/dev/kapsule-edge/terragrunt.hcl` and apply. A canned SQLi probe
  (`?q=' OR 1=1--`) is the cheapest way to see the ruleset fire.
- **The Load Balancer's own IP bypasses the WAF.** Restricting ingress to Edge
  Services is `loadBalancerSourceRanges` on the Service — the cloud controller
  manager turns that list into Load Balancer ACLs — but Scaleway does not
  publish the ranges Edge Services fetches origins from, so the block sits
  commented out in `service.yaml` until support provides them. Until then the
  WAF is a monitor in front of a reachable origin, not a gate.
- **Parity is functional, not data-identical.** The database starts empty:
  compare `/actuator/health`, a joke CRUD round-trip and the RFC 9457 error
  bodies against `https://jokes-api.martinschwarz.dev`, not row counts.

### Cutover, or not

Cutting over means repointing the `jokes-api` CNAME at pipeline #2's target and
retiring `dev/backend`; copying the rows (`pg_dump` between the two databases)
becomes a step only then. Abandoning means destroying `dev/kapsule-edge`,
`dev/kapsule-edge-deps`, `dev/kapsule-db`, `dev/kapsule` and deleting the
CNAME — the serverless stack never knew this existed.

Cost while both run: ~€53/month on top of today's ~€51 (DEV1-M 14.75, LB-S
16.79, db-dev-s + 10 GB ~12.50, additional pipeline 4.00, WAF from 4.00,
flexible IP and cents-level extras ~1).

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
