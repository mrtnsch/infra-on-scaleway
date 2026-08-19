package dev.martinschwarz.jokes.application

/**
 * Failure types for the jokes module. Services and ports return `Result<_, JokeError>` instead of
 * throwing; the web adapter maps these to HTTP responses at the boundary.
 */
sealed interface JokeError

/** A request violated a domain rule (e.g. empty or over-long content). */
data class ValidationError(
    val message: String,
) : JokeError

/** The requested joke does not exist, or the catalogue holds nothing to draw from. */
data object JokeNotFound : JokeError

/** An identical joke already exists in the same category. */
data object DuplicateJoke : JokeError

/** A persistence operation failed. */
data class JokePersistenceError(
    val cause: Throwable,
) : JokeError

/**
 * The wrapped throwable for the persistence variant, `null` for the others. Lets boundaries log via
 * `logger.error(error.causeOrNull())` so the stack trace survives instead of an interpolated string.
 */
fun JokeError.causeOrNull(): Throwable? =
    when (this) {
        is JokePersistenceError -> cause
        is ValidationError, JokeNotFound, DuplicateJoke -> null
    }
