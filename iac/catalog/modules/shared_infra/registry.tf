################################################################################
# Container Registry — images for the Joke API backend
################################################################################

# Shared rather than per-environment: dev and prod deploy the same image, and
# promoting a tag between them should not mean copying it between namespaces.
resource "scaleway_registry_namespace" "backend" {
  name        = var.registry_namespace_name
  description = "Container images for the Joke API backend"
  is_public   = false
}
