output "custom_endpoint" {
  description = "HTTPS endpoint of the custom domain, null when there is none"
  value       = var.custom_hostname == null ? null : "https://${var.custom_hostname}"
}

output "site_url" {
  description = "Where the site is served"
  value       = var.custom_hostname == null ? "https://${scaleway_edge_services_dns_stage.site.default_fqdn}" : "https://${var.custom_hostname}"
}

# Proves frontend_deps' derived edge_cname_target still matches reality.
output "default_fqdn" {
  description = "Generated FQDN on the DNS stage; the authoritative CNAME target"
  value       = scaleway_edge_services_dns_stage.site.default_fqdn
}

output "bucket_name" {
  description = "Upload target for //frontend:deploy"
  value       = scaleway_object_bucket.site.name
}

output "bucket_website_endpoint" {
  description = "Bucket website endpoint; bypasses the CDN"
  value       = scaleway_object_bucket_website_configuration.site.website_endpoint
}

output "bucket_api_endpoint" {
  description = "S3 API endpoint //frontend:deploy uploads through"
  value       = scaleway_object_bucket.site.api_endpoint
}
