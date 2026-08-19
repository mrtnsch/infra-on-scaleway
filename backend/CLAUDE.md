# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in `backend`.

A Kotlin / Spring Boot 4 **joke catalogue** API: browse jokes, draw a random one, contribute new
ones. It is the demo workload deployed by the infrastructure in this repository, so it is small on
purpose but wired the way a production service is.

## Commands

Run from `backend/`. The Gradle wrapper is `./gradlew`.

- **Build:** `./gradlew build`
- **Run:** `./gradlew bootRun` (starts `compose.yaml`'s Postgres automatically)
- **Compile only (fast feedback):** `./gradlew compileKotlin`
- **Test (all):** `./gradlew test` — needs Docker for Testcontainers
- **Single test class:** `./gradlew test --tests '*JokeControllerIntegrationTest'`
- **Lint check:** `./gradlew ktlintCheck` · **auto-format:** `./gradlew ktlintFormat`
- **Static analysis:** `./gradlew detekt` · **coverage:** `./gradlew koverHtmlReport`
- **Regenerate API stubs/DTOs:** `./gradlew openApiGenerate` (a dependency of `compileKotlin`)

> ktlint/format race: don't chain `format` and `check` in one Gradle invocation — they have no
> ordering dependency and may run out of order. Run format first, then check, as separate commands.

## Architecture

**Hexagonal (ports & adapters)**, one business module:

```
jokes/                            (package dev.martinschwarz.jokes)
├── domain/                       pure Kotlin: Joke, JokeCategory. No Spring/JPA.
├── application/                  JokeService orchestrates; owns the transactions and the duplicate
│   │                             rule. JokeError is the failure vocabulary.
│   └── port/out/                 driven port: JokeStore
└── adapter/
    ├── inbound/web/              JokeController implements the generated JokesApi
    └── out/persistence/          JokeEntity, JokeJpaRepository, JokePersistenceAdapter
```

**Dependency rule:** `adapter → application (ports) → domain`. The domain never imports Spring or
JPA; the application never imports an adapter. `LayeredArchitectureTests` (ArchUnit) enforces all
three rules — keep it green.

There are no inbound port interfaces: with a single module the controller depends on `JokeService`
directly. Add them if a second inbound adapter ever appears.

## Conventions & preferences

### Error handling — result4k, not exceptions
- Services and ports return `Result<T, JokeError>` (forkhandles **result4k**) instead of throwing.
  Ports are documented "Never throws."
- **Prefer combinators over `when (is Success/Failure)`**: `map`, `flatMap`, `mapFailure`, `peek`.
  Compose one railway-style chain; extract a private helper when a chain gets deep.
- `JokeError` is a sealed hierarchy (`ValidationError`, `JokeNotFound`, `DuplicateJoke`,
  `JokePersistenceError`). Map to HTTP **only at the web boundary** (`JokeController` →
  `ResponseStatusException`, rendered as RFC 9457 problem details).

### Kotlin / Spring
- **Constructor injection only** — no field injection in main code.
- `@ConfigurationProperties` on **immutable data classes with defaults**, scanned via
  `@ConfigurationPropertiesScan`.
- Logging: top-level `private val logger = KotlinLogging.logger {}` (io.github.oshai), lazy `{ }`.
- Adapters wrap IO in the private `persisting { … }` helper rather than try/catch.
- Keep comments sparse: explain **why**, never mechanics.
- Virtual threads are on (`spring.threads.virtual.enabled`). Write simple blocking code.

### Persistence (JPA)
- `@Entity` classes live only in `adapter/out/persistence`; domain ↔ entity mapping via `toDomain()` /
  `toEntity()` extension functions. Entities never leak past the adapter.
- **Transactions belong on the application service** (`@Transactional`, `readOnly = true` for reads).
- Schema `jokes`, `ddl-auto: none` — the schema is owned by Liquibase.
- The random draw is a native query using `{h-schema}` so it resolves Hibernate's default schema;
  plain native SQL would bypass it.
- Paging uses Spring Data directly: `JokeStore.findPage` takes a `Pageable` and returns `Page<Joke>`
  (domain objects — entities still never leave the adapter). The **store owns the ordering**, since it
  is expressed in entity property names, so only the page number and size of the incoming `Pageable`
  are honoured. Page defaults and the maximum size live in the OpenAPI contract — don't mirror them in
  config, or the two drift and the config silently loses.
- Careful with `x?.let { query(it) } ?: fallback()` — a null *result* then triggers the fallback.
  Use `if (x == null) … else …` when the query can legitimately return null.

### Web / API — contract-first
- OpenAPI spec at `src/main/resources/api/openapi.yaml` generates interface-only `*Api` + `*DTO`
  models (suffix `DTO`). Controllers implement the generated `*Api`; **never hand-write a mapping
  that the spec should describe** — change the spec first.
- Domain ↔ DTO mapping via private extension functions in the controller file.
- Contract-level bounds (`minLength`, `maximum`, …) are enforced by generated bean-validation
  annotations and re-checked in `validateContent`, so the rule holds even for non-HTTP callers.

### Database migrations
- Liquibase master changelog at `db/changelog/db.changelog-master.xml`; new changelogs go under
  `db/changelog/<year>/<month>/<day>-<topic>.xml` and are appended to the master include list.
- Never edit an applied changeset — add a new one.

## Testing
- **JUnit 5 + `kotlin.test`** assertions; backtick test names.
- **Don't use Mockito/MockK** — they fragment the Spring context cache and invite interaction
  assertions instead of behavior assertions.
- **Integration tests** extend `IntegrationTestBase` (`@SpringBootTest` + Testcontainers Postgres).
  It clears the catalogue before each test, so tests seed exactly what they assert on.
- **Preserve the shared context cache:** keep all config on `IntegrationTestBase`; adding
  `@TestPropertySource`, extra `@Import`, `@MockitoBean` etc. to a subclass forks a second context.
- **Extract pure logic** (e.g. `validateContent`) and unit-test it directly — fast and Docker-free.
- Don't fake the store: Testcontainers is wired and fast, and a fake store just re-implements the
  queries under test.

## Deployment
`Dockerfile` builds a distroless-ish JRE image (multi-stage, temurin 24) listening on **8080**.
Required environment: `SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (see
`.env.example`). Health at `/actuator/health`, probes at `/actuator/health/{liveness,readiness}`.
Shutdown is graceful.

## Stack / versions
Kotlin 2.2.21 · Spring Boot 4.0.5 · JDK toolchain 24 (Kotlin doesn't yet support 25) · Hibernate 7 ·
Liquibase · Postgres 18 · result4k 2.22 · openapi-generator 7.19 (kotlin-spring) · ktlint 1.8.0 ·
detekt 2.0.0-alpha.1 · kover · Testcontainers.

Build gotchas: ktlint is pinned to 1.8.0 (≤1.6 breaks on Kotlin 2.2); detekt's Kotlin classpath is
pinned to 2.2.20; both ktlint and `compileKotlin` depend on `openApiGenerate`; the `/generated/`
output is excluded from ktlint and kover.
