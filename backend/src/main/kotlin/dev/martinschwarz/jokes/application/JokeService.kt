package dev.martinschwarz.jokes.application

import dev.forkhandles.result4k.Failure
import dev.forkhandles.result4k.Result
import dev.forkhandles.result4k.Success
import dev.forkhandles.result4k.flatMap
import dev.forkhandles.result4k.peek
import dev.martinschwarz.jokes.application.port.out.JokeStore
import dev.martinschwarz.jokes.domain.Joke
import dev.martinschwarz.jokes.domain.JokeCategory
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private val logger = KotlinLogging.logger {}

/** Bounds on a joke's content, mirrored by the OpenAPI contract and the `content` column. */
const val MIN_CONTENT_LENGTH = 3
const val MAX_CONTENT_LENGTH = 500

/**
 * Reads and writes over the joke catalogue. Owns the transactions and the duplicate rule; failures
 * surface as [JokeError] rather than exceptions. Paging bounds (defaults and maximum) are declared in
 * the OpenAPI contract and enforced by the generated bean-validation annotations, so they are not
 * repeated here.
 */
@Service
class JokeService(
    private val store: JokeStore,
) {
    @Transactional(readOnly = true)
    fun list(
        category: JokeCategory?,
        page: Int,
        size: Int,
    ): Result<Page<Joke>, JokeError> = store.findPage(category, PageRequest.of(page, size))

    @Transactional(readOnly = true)
    fun random(category: JokeCategory?): Result<Joke, JokeError> =
        store.findRandom(category).flatMap { it.orNotFound() }

    @Transactional(readOnly = true)
    fun get(id: UUID): Result<Joke, JokeError> = store.findById(id).flatMap { it.orNotFound() }

    @Transactional
    fun create(command: CreateJokeCommand): Result<Joke, JokeError> =
        validateContent(command.content)
            .flatMap { content -> rejectDuplicate(content, command.category) }
            .flatMap { content ->
                store.save(Joke(id = null, content = content, category = command.category, createdAt = null))
            }.peek { logger.info { "Created joke id=${it.id} category=${it.category}" } }

    private fun rejectDuplicate(
        content: String,
        category: JokeCategory,
    ): Result<String, JokeError> =
        store.exists(content, category).flatMap { exists ->
            if (exists) Failure(DuplicateJoke) else Success(content)
        }
}

/** What a create request carries, independent of the web DTOs. */
data class CreateJokeCommand(
    val content: String,
    val category: JokeCategory,
)

private fun Joke?.orNotFound(): Result<Joke, JokeError> = this?.let { Success(it) } ?: Failure(JokeNotFound)

/**
 * Normalizes and checks a joke's content, returning the storable form. Whitespace is collapsed first
 * so that "a  joke" and "a joke" are the same joke for both the length check and the duplicate rule.
 * Store-free and Spring-free, so it is exhaustively unit-testable.
 */
internal fun validateContent(raw: String?): Result<String, ValidationError> {
    val content = raw.orEmpty().trim().replace(WHITESPACE, " ")
    return when {
        content.length < MIN_CONTENT_LENGTH -> {
            Failure(ValidationError("Joke content must be at least $MIN_CONTENT_LENGTH characters"))
        }

        content.length > MAX_CONTENT_LENGTH -> {
            Failure(ValidationError("Joke content must be at most $MAX_CONTENT_LENGTH characters"))
        }

        else -> {
            Success(content)
        }
    }
}

private val WHITESPACE = Regex("\\s+")
