################################################################################
# Serverless Container — the Joke API itself
################################################################################

resource "scaleway_container_namespace" "main" {
  name = "${var.environment}-joke-api"
}

resource "scaleway_container" "backend" {
  name         = "${var.environment}-joke-api"
  namespace_id = scaleway_container_namespace.main.id
  image        = "${var.registry_endpoint}/${var.image_name}:${var.image_tag}"
  port         = 8080

  memory_limit_bytes = 2048000000
  cpu_limit          = 1120 # mvCPU; the only valid pairing for 2048 MB
  min_scale          = var.min_scale
  max_scale          = var.max_scale

  privacy                = "public"
  https_connections_only = true
  private_network_id     = scaleway_vpc_private_network.main.id

  # Only the values this module creates live here; everything else comes from
  # the live unit and wins on conflict.
  environment_variables = merge({
    DB_URL      = "jdbc:postgresql://${local.db_host}:${local.db_port}/${scaleway_rdb_database.main.name}"
    DB_USERNAME = scaleway_rdb_user.app.name
  }, var.environment_variables)

  secret_environment_variables = {
    DB_PASSWORD = random_password.db_app.result
  }

  # Spring Boot + Liquibase needs a long runway before the first probe passes.
  startup_probe {
    http {
      path = "/actuator/health/readiness"
    }
    failure_threshold = 30
    interval          = "5s"
    timeout           = "5s"
  }

  liveness_probe {
    http {
      path = "/actuator/health/liveness"
    }
    failure_threshold = 5
    interval          = "30s"
    timeout           = "5s"
  }

  scaling_option {
    concurrent_requests_threshold = var.concurrent_requests_threshold
  }

  # Nothing else ties the container to the grant, and a container that starts
  # first runs its migrations without one.
  depends_on = [scaleway_rdb_privilege.app]
}
