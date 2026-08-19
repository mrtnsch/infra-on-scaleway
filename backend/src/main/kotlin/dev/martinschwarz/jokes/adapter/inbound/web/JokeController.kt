package dev.martinschwarz.jokes.adapter.inbound.web

import dev.forkhandles.result4k.Failure
import dev.forkhandles.result4k.Success
import dev.martinschwarz.jokes.application.CreateJokeCommand
import dev.martinschwarz.jokes.application.DuplicateJoke
import dev.martinschwarz.jokes.application.JokeError
import dev.martinschwarz.jokes.application.JokeNotFound
import dev.martinschwarz.jokes.application.JokePersistenceError
import dev.martinschwarz.jokes.application.JokeService
import dev.martinschwarz.jokes.application.ValidationError
import dev.martinschwarz.jokes.domain.Joke
import dev.martinschwarz.jokes.domain.JokeCategory
import dev.martinschwarz.jokes.generated.web.api.JokesApi
import dev.martinschwarz.jokes.generated.web.model.CreateJokeRequestDTO
import dev.martinschwarz.jokes.generated.web.model.JokeCategoryDTO
import dev.martinschwarz.jokes.generated.web.model.JokeDTO
import dev.martinschwarz.jokes.generated.web.model.JokePageDTO
import org.springframework.data.domain.Page
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.net.URI
import java.util.UUID

/**
 * The catalogue's HTTP surface, implementing the generated contract. Domain errors become HTTP status
 * codes here and nowhere else; Spring renders them as RFC 9457 problem details.
 */
@RestController
class JokeController(
    private val service: JokeService,
) : JokesApi {
    override fun listJokes(
        category: JokeCategoryDTO?,
        page: Int,
        size: Int,
    ): ResponseEntity<JokePageDTO> =
        when (val result = service.list(category?.toDomain(), page, size)) {
            is Success -> ResponseEntity.ok(result.value.toDTO())
            is Failure -> throw result.reason.toResponseStatusException()
        }

    override fun getRandomJoke(category: JokeCategoryDTO?): ResponseEntity<JokeDTO> =
        when (val result = service.random(category?.toDomain())) {
            is Success -> ResponseEntity.ok(result.value.toDTO())
            is Failure -> throw result.reason.toResponseStatusException()
        }

    override fun getJoke(id: UUID): ResponseEntity<JokeDTO> =
        when (val result = service.get(id)) {
            is Success -> ResponseEntity.ok(result.value.toDTO())
            is Failure -> throw result.reason.toResponseStatusException()
        }

    override fun createJoke(createJokeRequestDTO: CreateJokeRequestDTO): ResponseEntity<JokeDTO> =
        when (val result = service.create(createJokeRequestDTO.toCommand())) {
            is Success -> {
                ResponseEntity
                    .created(URI.create("${JokesApi.PATH_CREATE_JOKE}/${result.value.id}"))
                    .body(result.value.toDTO())
            }

            is Failure -> {
                throw result.reason.toResponseStatusException()
            }
        }
}

private fun JokeError.toResponseStatusException(): ResponseStatusException =
    when (this) {
        is ValidationError -> ResponseStatusException(HttpStatus.BAD_REQUEST, message)
        is JokeNotFound -> ResponseStatusException(HttpStatus.NOT_FOUND, "No such joke")
        is DuplicateJoke -> ResponseStatusException(HttpStatus.CONFLICT, "This joke is already in the catalogue")
        is JokePersistenceError -> ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Database error", cause)
    }

private fun CreateJokeRequestDTO.toCommand(): CreateJokeCommand =
    CreateJokeCommand(
        content = content,
        category = category?.toDomain() ?: JokeCategory.GENERAL,
    )

// A persisted joke always carries both — the database assigns them on insert.
private fun Joke.toDTO(): JokeDTO =
    JokeDTO(
        id = id!!,
        content = content,
        category = JokeCategoryDTO.forValue(category.name),
        createdAt = createdAt!!,
    )

private fun Page<Joke>.toDTO(): JokePageDTO =
    JokePageDTO(
        items = content.map { it.toDTO() },
        page = number,
        propertySize = size,
        totalElements = totalElements,
        totalPages = totalPages,
    )

private fun JokeCategoryDTO.toDomain(): JokeCategory = JokeCategory.valueOf(value)
