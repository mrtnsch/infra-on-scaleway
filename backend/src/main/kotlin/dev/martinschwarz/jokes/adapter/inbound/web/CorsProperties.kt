package dev.martinschwarz.jokes.adapter.inbound.web

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Browser origins allowed to call the API. Defaults to the local frontend dev server; deployed
 * environments set `CORS_ALLOWED_ORIGINS` to the real origin(s), comma-separated.
 */
@ConfigurationProperties(prefix = "cors")
data class CorsProperties(
    val allowedOrigins: List<String> = listOf("http://localhost:5173"),
)
