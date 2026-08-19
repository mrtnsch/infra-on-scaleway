# infra-on-scaleway

Demo application and its infrastructure on Scaleway.

| Directory                         | What it is                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- |
| [`iac/`](iac/README.md)           | OpenTofu + Terragrunt infrastructure                                          |
| [`backend/`](backend/README.md)   | Joke API — Kotlin / Spring Boot                                               |
| [`frontend/`](frontend/README.md) | Joke SPA — React / Vite / TanStack, generated from the backend's OpenAPI spec |

Tool versions are pinned per directory with [mise](https://mise.jdx.dev):
`mise install`.

Formatting and lint checks run on staged files before every commit:
`mise run install-hooks` once per clone.

## Serverless Containers vs. Kapsule

The Joke API runs on Serverless Containers at `jokes-api.martinschwarz.dev`,
and — behind a WAF — on Kapsule at `jokes-api-k8s.martinschwarz.dev`. The two
share nothing but the container image; either can be retired without touching
the other (runbook and decisions in [`iac/README.md`](iac/README.md)). What the
choice comes down to here:

|                | Serverless Containers                    | Kapsule                                       |
| -------------- | ---------------------------------------- | --------------------------------------------- |
| Billing        | per-second, per instance (~€37/mo warm)  | fixed: node + LB (~€31/mo), extra apps ~free  |
| HTTPS + domain | built in, no extra cost                  | LB (€16.79/mo) + ingress/cert wiring          |
| WAF            | not possible — Edge WAF needs an LB origin | Edge pipeline → LB → pods                   |
| Scaling        | per-request, 0→N, cold starts if min 0   | pods within fixed node capacity               |
| Operations     | none — no nodes, rolling deploys included | k8s upgrades, node sizing, manifests         |
| Deploys        | push image, bump `image_tag`, apply      | `mise run //backend:k8s-deploy <tag>`         |

In short: one spiky app with no WAF requirement is cheapest and simplest
serverless; Kapsule starts paying off with a WAF requirement or a second
service sharing the nodes.
