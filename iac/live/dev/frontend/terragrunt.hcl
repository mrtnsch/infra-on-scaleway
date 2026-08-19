include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../catalog/modules//frontend"
}

dependency "frontend_deps" {
  config_path = "../frontend-deps"

  # Lets this unit plan before frontend-deps is applied; apply needs the real ID.
  mock_outputs_allowed_terraform_commands = ["init", "validate", "plan"]
  mock_outputs = {
    pipeline_id = "00000000-0000-0000-0000-000000000000"
  }
}

inputs = {
  bucket_name = "infra-on-scaleway-frontend-dev"
  pipeline_id = dependency.frontend_deps.outputs.pipeline_id

  # Apply only once this resolves to frontend_deps' edge_cname_target.
  custom_hostname = "jokes.martinschwarz.dev"
}
