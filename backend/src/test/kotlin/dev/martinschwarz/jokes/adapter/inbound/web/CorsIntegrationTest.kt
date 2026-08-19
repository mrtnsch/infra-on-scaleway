package dev.martinschwarz.jokes.adapter.inbound.web

import dev.martinschwarz.jokes.IntegrationTestBase
import org.springframework.http.HttpMethod
import kotlin.test.Test

class CorsIntegrationTest : IntegrationTestBase() {
    @Test
    fun `allows the configured frontend origin to read jokes`() {
        client
            .get()
            .uri("/jokes")
            .header("Origin", "http://localhost:5173")
            .exchange()
            .expectStatus()
            .isOk
            .expectHeader()
            .valueEquals("Access-Control-Allow-Origin", "http://localhost:5173")
    }

    @Test
    fun `answers the preflight for a create`() {
        client
            .method(HttpMethod.OPTIONS)
            .uri("/jokes")
            .header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Content-Type")
            .exchange()
            .expectStatus()
            .isOk
            .expectHeader()
            .valueEquals("Access-Control-Allow-Origin", "http://localhost:5173")
            .expectHeader()
            .valueEquals("Access-Control-Allow-Methods", "GET,POST")
    }

    @Test
    fun `rejects an unknown origin`() {
        client
            .get()
            .uri("/jokes")
            .header("Origin", "http://evil.example.com")
            .exchange()
            .expectStatus()
            .isForbidden
    }
}
