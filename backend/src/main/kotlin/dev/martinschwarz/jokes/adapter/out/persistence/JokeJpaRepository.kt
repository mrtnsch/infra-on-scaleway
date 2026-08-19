package dev.martinschwarz.jokes.adapter.out.persistence

import dev.martinschwarz.jokes.domain.JokeCategory
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface JokeJpaRepository : JpaRepository<JokeEntity, UUID> {
    fun findAllByCategory(
        category: JokeCategory,
        pageable: Pageable,
    ): Page<JokeEntity>

    fun existsByCategoryAndContent(
        category: JokeCategory,
        content: String,
    ): Boolean

    // Drawing in the database keeps it to one round trip and one row; `{h-schema}` resolves to
    // Hibernate's configured default schema, which plain native SQL would otherwise bypass.
    @Query(value = "select * from {h-schema}jokes order by random() limit 1", nativeQuery = true)
    fun findRandom(): JokeEntity?

    @Query(
        value = "select * from {h-schema}jokes where category = :category order by random() limit 1",
        nativeQuery = true,
    )
    fun findRandomByCategory(
        @Param("category") category: String,
    ): JokeEntity?
}
