output "pipeline_id" {
  description = "Pipeline the frontend unit hangs its stages on"
  value       = scaleway_edge_services_pipeline.site.id
}

# Derived, not read from the API: the DNS stage that carries the real FQDN
# lives in the frontend unit and cannot be created until this CNAME resolves.
output "edge_cname_target" {
  description = "CNAME value to set at the registrar before applying the frontend unit"
  value       = "${scaleway_edge_services_pipeline.site.id}.svc.edge.scw.cloud."
}
