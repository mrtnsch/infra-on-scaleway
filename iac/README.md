# Overview

## Infrastructure overview

OpenTofu + Terragrunt IaC on Scaleway. State lives in Scaleway Object Storage
(S3-compatible), region `fr-par`.

```
iac/
├── catalog/modules/         # Reusable OpenTofu modules
│   └── shared_infra/        # Object Storage state bucket
└── live/                    # Environment configs (one state file per folder)
    ├── root.hcl             # Shared backend + provider config
    ├── shared/              # Shared infra (state bucket)
    ├── dev/
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

## Everyday tasks

### Preview and apply changes

```bash
cd iac/live/shared
terragrunt plan
terragrunt apply
```

Across all units:

```bash
cd iac/live
terragrunt run --all plan
```

Always run `plan` first and review the output before applying.

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
