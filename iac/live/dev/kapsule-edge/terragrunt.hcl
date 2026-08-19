include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../catalog/modules//kapsule_edge"
}

dependency "kapsule_edge_deps" {
  config_path = "../kapsule-edge-deps"

  # Unlike the other units, this one cannot be planned early: it reads the
  # Load Balancer's frontends from the API, so a mock ID fails with a 404.
  # `plan` works once dev/kapsule is applied and the Service is deployed.
  mock_outputs_allowed_terraform_commands = ["init", "validate"]
  mock_outputs = {
    pipeline_id = "00000000-0000-0000-0000-000000000000"
  }
}

dependency "kapsule" {
  config_path = "../kapsule"

  mock_outputs_allowed_terraform_commands = ["init", "validate"]
  mock_outputs = {
    lb_id = "fr-par-1/00000000-0000-0000-0000-000000000000"
  }
}

inputs = {
  pipeline_id = dependency.kapsule_edge_deps.outputs.pipeline_id
  lb_id       = dependency.kapsule.outputs.lb_id

  # Apply only once this resolves to kapsule-edge-deps' edge_cname_target.
  custom_hostname = "jokes-api-k8s.martinschwarz.dev"

  # Flip to "enable" once the baseline is clean; see iac/README.md.
  waf_mode = "log_only"
}
