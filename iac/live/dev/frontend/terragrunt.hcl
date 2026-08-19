include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../catalog/modules//frontend"
}

dependency "frontend_deps" {
  config_path = "../frontend-deps"
}

inputs = {
  bucket_name = "infra-on-scaleway-frontend-dev"
  pipeline_id = dependency.frontend_deps.outputs.pipeline_id

  # Apply only once this resolves to frontend_deps' edge_cname_target.
  custom_hostname = "jokes.martinschwarz.dev"
}
