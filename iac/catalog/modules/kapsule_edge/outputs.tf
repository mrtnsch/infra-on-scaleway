output "api_endpoint" {
  description = "Where the k8s runtime is served"
  value       = var.custom_hostname == null ? "https://${scaleway_edge_services_dns_stage.api.default_fqdn}" : "https://${var.custom_hostname}"
}

# Proves kapsule-edge-deps' derived edge_cname_target still matches reality.
output "default_fqdn" {
  description = "Generated FQDN on the DNS stage; the authoritative CNAME target"
  value       = scaleway_edge_services_dns_stage.api.default_fqdn
}

output "origin_frontend_id" {
  description = "Load Balancer frontend Edge Services sends traffic to; created by the cloud controller manager"
  value       = local.origin_frontend_id
}

output "waf_mode" {
  description = "Current WAF behaviour"
  value       = scaleway_edge_services_waf_stage.api.mode
}
