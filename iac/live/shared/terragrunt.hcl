include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../catalog/modules//shared_infra"
}

inputs = {
  state_bucket_name       = "infra-on-scaleway-tfstate"
  registry_namespace_name = "infra-on-scaleway"
}
