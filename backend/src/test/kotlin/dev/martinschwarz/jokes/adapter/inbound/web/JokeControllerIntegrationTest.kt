package dev.martinschwarz.jokes.adapter.inbound.web

import dev.martinschwarz.jokes.IntegrationTestBase
import dev.martinschwarz.jokes.domain.JokeCategory
import dev.martinschwarz.jokes.generated.web.model.JokeCategoryDTO
import dev.martinschwarz.jokes.generated.web.model.JokeDTO
import dev.martinschwarz.jokes.generated.web.model.JokePageDTO
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class JokeControllerIntegrationTest : IntegrationTestBase() {
    @Test
    fun `lists jokes newest first and reports the page counters`() {
        repeat(3) { seed("Joke number $it") }

        val page =
            client
                .get()
                .uri("/jokes?page=0&size=2")
                .exchange()
                .expectStatus()
                .isOk
                .expectBody(JokePageDTO::class.java)
                .returnResult()
                .responseBody

        assertNotNull(page)
        assertEquals(2, page.items.size)
        assertEquals(3, page.totalElements)
        assertEquals(2, page.totalPages)
        assertEquals(0, page.page)
    }

    @Test
    fun `filters the listing by category`() {
        seed("A general joke", JokeCategory.GENERAL)
        seed("A programming joke", JokeCategory.PROGRAMMING)

        val page =
            client
                .get()
                .uri("/jokes?category=PROGRAMMING")
                .exchange()
                .expectStatus()
                .isOk
                .expectBody(JokePageDTO::class.java)
                .returnResult()
                .responseBody

        assertNotNull(page)
        assertEquals(1, page.totalElements)
        assertEquals(JokeCategoryDTO.PROGRAMMING, page.items.single().category)
    }

    @Test
    fun `rejects a page size beyond the contract maximum`() {
        seed("A joke to page over")

        client
            .get()
            .uri("/jokes?size=1000")
            .exchange()
            .expectStatus()
            .isBadRequest
    }

    @Test
    fun `draws a random joke from the requested category`() {
        seed("A general joke", JokeCategory.GENERAL)
        seed("A pun", JokeCategory.PUN)

        val joke =
            client
                .get()
                .uri("/jokes/random?category=PUN")
                .exchange()
                .expectStatus()
                .isOk
                .expectBody(JokeDTO::class.java)
                .returnResult()
                .responseBody

        assertEquals("A pun", assertNotNull(joke).content)
    }

    @Test
    fun `returns 404 when the requested category holds no jokes`() {
        seed("A general joke", JokeCategory.GENERAL)

        client
            .get()
            .uri("/jokes/random?category=DAD")
            .exchange()
            .expectStatus()
            .isNotFound
    }

    @Test
    fun `creates a joke and points Location at it`() {
        val response =
            client
                .post()
                .uri("/jokes")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"content":"  Why did the chicken cross the road?  ","category":"DAD"}""")
                .exchange()
                .expectStatus()
                .isCreated
                .expectBody(JokeDTO::class.java)
                .returnResult()

        val created = assertNotNull(response.responseBody)
        assertEquals("Why did the chicken cross the road?", created.content)
        assertEquals(JokeCategoryDTO.DAD, created.category)
        assertEquals("/jokes/${created.id}", response.responseHeaders.location.toString())

        client
            .get()
            .uri("/jokes/${created.id}")
            .exchange()
            .expectStatus()
            .isOk
    }

    @Test
    fun `defaults an unspecified category to GENERAL`() {
        val created =
            client
                .post()
                .uri("/jokes")
                .contentType(MediaType.APPLICATION_JSON)
                .body("""{"content":"A joke without a category"}""")
                .exchange()
                .expectStatus()
                .isCreated
                .expectBody(JokeDTO::class.java)
                .returnResult()
                .responseBody

        assertEquals(JokeCategoryDTO.GENERAL, assertNotNull(created).category)
    }

    @Test
    fun `rejects a duplicate joke in the same category`() {
        seed("An already told joke", JokeCategory.PUN)

        client
            .post()
            .uri("/jokes")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"content":"An already told joke","category":"PUN"}""")
            .exchange()
            .expectStatus()
            .isEqualTo(HttpStatus.CONFLICT)
    }

    @Test
    fun `rejects content below the minimum length`() {
        client
            .post()
            .uri("/jokes")
            .contentType(MediaType.APPLICATION_JSON)
            .body("""{"content":"hi"}""")
            .exchange()
            .expectStatus()
            .isBadRequest
    }

    @Test
    fun `returns 404 for an unknown id`() {
        client
            .get()
            .uri("/jokes/00000000-0000-0000-0000-000000000000")
            .exchange()
            .expectStatus()
            .isNotFound
    }

    @Test
    fun `reports readiness once the database is reachable`() {
        val body =
            client
                .get()
                .uri("/actuator/health/readiness")
                .exchange()
                .expectStatus()
                .isOk
                .expectBody(String::class.java)
                .returnResult()
                .responseBody

        assertTrue(assertNotNull(body).contains("UP"))
    }
}
