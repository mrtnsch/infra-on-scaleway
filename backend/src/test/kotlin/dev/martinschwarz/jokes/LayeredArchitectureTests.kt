package dev.martinschwarz.jokes

import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import org.junit.jupiter.api.Test

/** Turns the hexagonal dependency rule (`adapter -> application (ports) -> domain`) into CI. */
class LayeredArchitectureTests {
    private val classes =
        ClassFileImporter()
            .withImportOption(ImportOption.DoNotIncludeTests())
            .importPackages("dev.martinschwarz.jokes")

    @Test
    fun `domain depends on neither application nor adapter`() {
        noClasses()
            .that()
            .resideInAPackage("..domain..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage("..application..", "..adapter..")
            .because("domain is the innermost layer: adapter -> application (ports) -> domain")
            .check(classes)
    }

    @Test
    fun `application does not depend on adapter`() {
        noClasses()
            .that()
            .resideInAPackage("..application..")
            .should()
            .dependOnClassesThat()
            .resideInAPackage("..adapter..")
            .because("application owns the ports; adapters implement them, never the reverse")
            .check(classes)
    }

    @Test
    fun `domain stays free of Spring and JPA`() {
        noClasses()
            .that()
            .resideInAPackage("..domain..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage("org.springframework..", "jakarta.persistence..", "org.hibernate..")
            .because("the domain is plain Kotlin, independent of any framework")
            .check(classes)
    }
}
