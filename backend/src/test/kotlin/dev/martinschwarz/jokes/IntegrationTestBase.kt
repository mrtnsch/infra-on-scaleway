package dev.martinschwarz.jokes

import dev.martinschwarz.jokes.adapter.out.persistence.JokeEntity
import dev.martinschwarz.jokes.adapter.out.persistence.JokeJpaRepository
import dev.martinschwarz.jokes.domain.JokeCategory
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.client.RestTestClient
import org.springframework.web.context.WebApplicationContext

// One shared context for the whole integration suite: subclasses must not add context-mutating
// annotations (@MockitoBean, extra @Import, @TestPropertySource, ...) or they fork a second,
// separately-cached context and double the suite's startup cost.
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
abstract class IntegrationTestBase {
    @Autowired
    private lateinit var context: WebApplicationContext

    @Autowired
    protected lateinit var repository: JokeJpaRepository

    protected lateinit var client: RestTestClient

    /** Drops the Liquibase seed data so each test starts from a catalogue it fully controls. */
    @BeforeEach
    fun resetCatalogue() {
        repository.deleteAll()
    }

    @BeforeEach
    fun setUpClient() {
        client = RestTestClient.bindToApplicationContext(context).build()
    }

    protected fun seed(
        content: String,
        category: JokeCategory = JokeCategory.GENERAL,
    ): JokeEntity = repository.saveAndFlush(JokeEntity(content = content, category = category))
}
