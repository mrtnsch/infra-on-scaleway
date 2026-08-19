# infra-on-scaleway

Demo application and its infrastructure on Scaleway.

| Directory                         | What it is                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- |
| [`iac/`](iac/README.md)           | OpenTofu + Terragrunt infrastructure                                          |
| [`backend/`](backend/README.md)   | Joke API — Kotlin / Spring Boot                                               |
| [`frontend/`](frontend/README.md) | Joke SPA — React / Vite / TanStack, generated from the backend's OpenAPI spec |

Tool versions are pinned per directory with [mise](https://mise.jdx.dev):
`mise install`.
