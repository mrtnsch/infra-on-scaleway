include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "../../../catalog/modules//frontend_deps"
}

# Ordering only: a pipeline needs the project's Edge Services subscription.
dependencies {
  paths = ["../../shared"]
}

inputs = {
  name        = "dev-joke-api-k8s"
  description = "WAF, cache and TLS for the Joke API on Kapsule"
}
