plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dependency.management)
    alias(libs.plugins.openapi.generator)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
    alias(libs.plugins.kover)
}

group = "dev.martinschwarz"
version = "0.0.1-SNAPSHOT"
description = "backend"

java {
    toolchain {
        // Kotlin currently does not support Java 25; pin to 24.
        languageVersion = JavaLanguageVersion.of(24)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform(libs.forkhandles.bom))
    implementation(libs.result4k)
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-liquibase")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation(libs.kotlin.logging.jvm)
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    developmentOnly("org.springframework.boot:spring-boot-docker-compose")
    runtimeOnly("org.postgresql:postgresql")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-liquibase-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation(libs.archunit.junit5)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    detekt(libs.detekt.cli)
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// OpenAPI contract-first generation of server stubs and DTOs
openApiGenerate {
    generatorName.set("kotlin-spring")
    inputSpec.set("$projectDir/src/main/resources/api/openapi.yaml")
    outputDir.set("$projectDir/build/generated")
    apiPackage.set("dev.martinschwarz.jokes.generated.web.api")
    modelPackage.set("dev.martinschwarz.jokes.generated.web.model")
    modelNameSuffix.set("DTO")
    configOptions.set(
        mapOf(
            "documentationProvider" to "source",
            "interfaceOnly" to "true",
            "useSpringBoot3" to "true",
            "useTags" to "true",
            "annotationLibrary" to "none",
        ),
    )
}

sourceSets {
    main {
        kotlin {
            srcDir("build/generated/src/main/kotlin")
        }
    }
}

tasks.compileKotlin {
    dependsOn(tasks.openApiGenerate)
}

ktlint {
    // ktlint <= 1.6 bundles a Kotlin lexer that breaks on Kotlin 2.2 (missing HEADER_KEYWORD token)
    version.set("1.8.0")
    filter {
        exclude { entry ->
            entry.file.toString().contains("/generated/")
        }
    }
}

// ktlint scans the main source set, which includes the openApiGenerate output dir
tasks
    .matching { it.name.startsWith("runKtlint") || it.name.startsWith("ktlintMainSourceSetCheck") }
    .configureEach { dependsOn(tasks.openApiGenerate) }

detekt {
    config.setFrom(files("$rootDir/detekt.yml"))
    buildUponDefaultConfig = true
    source.setFrom(files("src/main/kotlin", "src/test/kotlin"))
}

// detekt 2.0.0-alpha.1 was compiled with Kotlin 2.2.20; pin its classpath to avoid a version mismatch
configurations.matching { it.name.startsWith("detekt") }.all {
    resolutionStrategy.eachDependency {
        if (requested.group == "org.jetbrains.kotlin") {
            useVersion("2.2.20")
        }
    }
}

kover {
    reports {
        filters {
            excludes {
                packages("dev.martinschwarz.jokes.generated", "org.openapitools.configuration")
                classes("dev.martinschwarz.jokes.BackendApplicationKt")
            }
        }
    }
}
