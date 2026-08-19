package dev.martinschwarz.jokes.application

import dev.forkhandles.result4k.Failure
import dev.forkhandles.result4k.Success
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class JokeContentValidationTest {
    @Test
    fun `trims and collapses whitespace`() {
        val result = validateContent("  a   joke\twith   spacing  ")

        assertEquals("a joke with spacing", assertIs<Success<String>>(result).value)
    }

    @Test
    fun `rejects content below the minimum length`() {
        assertIs<Failure<ValidationError>>(validateContent("hi"))
    }

    @Test
    fun `rejects blank content`() {
        assertIs<Failure<ValidationError>>(validateContent("     "))
    }

    @Test
    fun `rejects null content`() {
        assertIs<Failure<ValidationError>>(validateContent(null))
    }

    @Test
    fun `rejects content above the maximum length`() {
        assertIs<Failure<ValidationError>>(validateContent("a".repeat(MAX_CONTENT_LENGTH + 1)))
    }

    @Test
    fun `accepts content at the maximum length`() {
        assertIs<Success<String>>(validateContent("a".repeat(MAX_CONTENT_LENGTH)))
    }
}
