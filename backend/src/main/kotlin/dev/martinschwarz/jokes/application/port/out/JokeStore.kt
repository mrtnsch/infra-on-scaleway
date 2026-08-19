package dev.martinschwarz.jokes.application.port.out

import dev.forkhandles.result4k.Result
import dev.martinschwarz.jokes.application.JokeError
import dev.martinschwarz.jokes.domain.Joke
import dev.martinschwarz.jokes.domain.JokeCategory
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import java.util.UUID

/** Driven port for reading and persisting jokes. Never throws. */
interface JokeStore {
    /**
     * One page of jokes, optionally restricted to [category]. Only [Pageable.getPageNumber] and
     * [Pageable.getPageSize] are honoured — the ordering is the store's own, so paging stays stable.
     */
    fun findPage(
        category: JokeCategory?,
        pageable: Pageable,
    ): Result<Page<Joke>, JokeError>

    /** A uniformly-drawn joke from [category] (or the whole catalogue), or `null` when there is none. */
    fun findRandom(category: JokeCategory?): Result<Joke?, JokeError>

    /** The joke with [id], or `null`. */
    fun findById(id: UUID): Result<Joke?, JokeError>

    /** Whether the exact [content] already exists in [category]. */
    fun exists(
        content: String,
        category: JokeCategory,
    ): Result<Boolean, JokeError>

    /** Inserts the joke and returns the stored form, including the generated id and timestamp. */
    fun save(joke: Joke): Result<Joke, JokeError>
}
