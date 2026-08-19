# Kubernetes manifests

The Joke API on Kapsule — the second, parallel runtime described in
`iac/README.md`. Deployed with `mise run //backend:k8s-deploy <tag>`, never by
OpenTofu: the IaC owns the cluster, the Load Balancer and the database; the
manifests own the workload.

Two things are deliberately not in git and are created by the deploy task from
unit outputs:

- **Secret `joke-api-db`** — `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` from
  `live/dev/kapsule-db`.
- **Secret `scw-registry`** — the registry pull secret, from `SCW_SECRET_KEY`.

The Service's `scw-loadbalancer-id` annotation is also filled in at deploy time,
through a generated overlay in `build/k8s/` (gitignored). The placeholder in
`service.yaml` is never applied: applying a `type: LoadBalancer` Service without
that annotation makes the cloud controller manager create a second, billable
Load Balancer instead of adopting the one OpenTofu created.
