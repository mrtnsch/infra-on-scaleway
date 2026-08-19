# Applied before the unit that hangs stages off it: the pipeline ID is the CNAME
# target, so it has to exist before the record can be created. Nothing here is
# frontend-specific — every runtime that fronts itself with Edge Services needs
# the same pipeline-first split.
resource "scaleway_edge_services_pipeline" "site" {
  name        = var.name
  description = var.description
}
