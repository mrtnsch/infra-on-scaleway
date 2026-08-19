# A project-wide subscription, not a per-pipeline charge. Starter covers one
# pipeline, so prod means an additional-pipeline charge or an upgrade.
resource "scaleway_edge_services_plan" "main" {
  name = var.edge_services_plan
}
