package dev.martinschwarz.jokes.adapter.out.persistence

import dev.martinschwarz.jokes.domain.JokeCategory
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.OffsetDateTime
import java.util.UUID

@Entity(name = "joke")
@Table(name = "jokes")
class JokeEntity(
    @Column(name = "content", nullable = false, length = 500)
    var content: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 32)
    var category: JokeCategory,
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
) {
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: OffsetDateTime? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: OffsetDateTime? = null
}
