# Applied before the frontend unit: the pipeline ID is the CNAME target, so it
# has to exist before the record can be created.
resource "scaleway_edge_services_pipeline" "site" {
  name        = "${var.environment}-joke-frontend"
  description = "CDN and TLS for the Joke SPA"
}
