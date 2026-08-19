# Joke API

A small, production-shaped Kotlin / Spring Boot service: a joke catalogue you can browse, draw from
at random, and add to. It is the demo workload for this repository's infrastructure.

## Endpoints

| Method | Path            | Description                                              |
|--------|-----------------|----------------------------------------------------------|
| GET    | `/jokes`        | Paged list, newest first; optional `category` filter      |
| GET    | `/jokes/random` | A random joke, optionally from one `category`             |
| GET    | `/jokes/{id}`   | A single joke                                             |
| POST   | `/jokes`        | Add a joke; returns `201` with a `Location` header        |
| GET    | `/actuator/health` | Health, plus `/liveness` and `/readiness` probes       |

The contract is authoritative and lives in
[`src/main/resources/api/openapi.yaml`](src/main/resources/api/openapi.yaml) — server interfaces and
DTOs are generated from it, so the code cannot drift from the spec.

## Running locally

Requires Docker (for Postgres and for the test suite) and nothing else — the Gradle wrapper fetches
its own toolchain.

```bash
./gradlew bootRun    # starts compose.yaml's Postgres, migrates, serves on :8080
curl localhost:8080/jokes/random
```

Liquibase creates the `jokes` schema and seeds a handful of jokes, so the API answers immediately.
Sample requests live in [`.http/joke-api.http`](.http/joke-api.http).

## Testing and quality gates

```bash
./gradlew test          # unit + Testcontainers integration tests
./gradlew ktlintCheck   # style     (./gradlew ktlintFormat to fix)
./gradlew detekt        # static analysis
./gradlew build         # all of the above
```

## Deployment

`docker build -t joke-api .` produces a JRE image listening on **8080**. Configure it with
`SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USERNAME` and `DB_PASSWORD` — see
[`.env.example`](.env.example). Migrations run on startup; point the readiness probe at
`/actuator/health/readiness`.

Architecture, conventions and gotchas are documented in [`CLAUDE.md`](CLAUDE.md).
