include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../catalog/modules//kapsule"
}

inputs = {
  environment = "dev"
}
