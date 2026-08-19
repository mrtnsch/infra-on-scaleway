include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../catalog/modules//backend"
}

dependency "shared" {
  config_path = "../../shared"

  # Lets this unit plan before shared is applied; apply needs the real output.
  mock_outputs_allowed_terraform_commands = ["init", "validate", "plan"]
  mock_outputs = {
    registry_endpoint = "rg.fr-par.scw.cloud/mock"
  }
}

inputs = {
  environment       = "dev"
  registry_endpoint = dependency.shared.outputs.registry_endpoint
  image_tag         = "0.0.1"

  custom_hostname = "jokes-api.martinschwarz.dev"

  environment_variables = {
    SPRING_PROFILES_ACTIVE                     = "prod"
    CORS_ALLOWED_ORIGINS                       = "https://jokes.martinschwarz.dev"
    SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE = "10"
  }
}
