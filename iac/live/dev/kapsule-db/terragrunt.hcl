include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../catalog/modules//kapsule_db"
}

dependency "kapsule" {
  config_path = "../kapsule"

  # Lets this unit plan before kapsule is applied; apply needs the real network.
  mock_outputs_allowed_terraform_commands = ["init", "validate", "plan"]
  mock_outputs = {
    pn_id = "00000000-0000-0000-0000-000000000000"
  }
}

inputs = {
  environment = "dev"
  pn_id       = dependency.kapsule.outputs.pn_id
}
