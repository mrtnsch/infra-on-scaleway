package dev.martinschwarz.jokes.adapter.inbound.web

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

/** CORS for the browser clients; credentials stay off because the API carries no session or auth. */
@Configuration
class CorsConfig(
    private val properties: CorsProperties,
) : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry
            .addMapping("/**")
            .allowedOrigins(*properties.allowedOrigins.toTypedArray())
            .allowedMethods("GET", "POST")
            .allowedHeaders("Content-Type")
    }
}
