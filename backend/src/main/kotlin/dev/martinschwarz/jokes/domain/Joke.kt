package dev.martinschwarz.jokes.domain

import java.time.OffsetDateTime
import java.util.UUID

/**
 * A single joke in the catalogue. [id] and [createdAt] are `null` until the joke is persisted — the
 * database owns both, so nothing upstream has to invent them.
 */
data class Joke(
    val id: UUID?,
    val content: String,
    val category: JokeCategory,
    val createdAt: OffsetDateTime?,
)
