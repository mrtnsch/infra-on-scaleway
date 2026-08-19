package dev.martinschwarz.jokes.adapter.out.persistence

import dev.forkhandles.result4k.Result
import dev.forkhandles.result4k.mapFailure
import dev.forkhandles.result4k.resultFrom
import dev.martinschwarz.jokes.application.DuplicateJoke
import dev.martinschwarz.jokes.application.JokeError
import dev.martinschwarz.jokes.application.JokePersistenceError
import dev.martinschwarz.jokes.application.port.out.JokeStore
import dev.martinschwarz.jokes.domain.Joke
import dev.martinschwarz.jokes.domain.JokeCategory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Component
import java.util.UUID

// id breaks ties so the ordering stays stable across pages when timestamps collide.
private val NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt", "id")

@Component
class JokePersistenceAdapter(
    private val repository: JokeJpaRepository,
) : JokeStore {
    override fun findPage(
        category: JokeCategory?,
        pageable: Pageable,
    ): Result<Page<Joke>, JokeError> =
        persisting {
            val request = PageRequest.of(pageable.pageNumber, pageable.pageSize, NEWEST_FIRST)
            val found =
                if (category == null) repository.findAll(request) else repository.findAllByCategory(category, request)
            found.map { it.toDomain() }
        }

    override fun findRandom(category: JokeCategory?): Result<Joke?, JokeError> =
        persisting {
            // if/else, not `category?.let { ... } ?: findRandom()`: an empty category must stay empty
            // rather than silently falling back to a draw across the whole catalogue.
            val found =
                if (category ==
                    null
                ) {
                    repository.findRandom()
                } else {
                    repository.findRandomByCategory(category.name)
                }
            found?.toDomain()
        }

    override fun findById(id: UUID): Result<Joke?, JokeError> =
        persisting {
            repository.findById(id).orElse(null)?.toDomain()
        }

    override fun exists(
        content: String,
        category: JokeCategory,
    ): Result<Boolean, JokeError> = persisting { repository.existsByCategoryAndContent(category, content) }

    // Flushed here so the unique-constraint backstop surfaces as DuplicateJoke inside this call,
    // rather than as an opaque failure when the surrounding transaction commits.
    override fun save(joke: Joke): Result<Joke, JokeError> =
        persisting { repository.saveAndFlush(joke.toEntity()).toDomain() }

    private inline fun <T> persisting(block: () -> T): Result<T, JokeError> =
        resultFrom(block).mapFailure {
            if (it is DataIntegrityViolationException) DuplicateJoke else JokePersistenceError(it)
        }
}

private fun JokeEntity.toDomain(): Joke =
    Joke(
        id = id,
        content = content,
        category = category,
        createdAt = createdAt,
    )

private fun Joke.toEntity(): JokeEntity =
    JokeEntity(
        content = content,
        category = category,
        id = id,
    )
