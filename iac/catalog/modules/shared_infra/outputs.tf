output "state_bucket_name" {
  description = "Name of the state bucket"
  value       = scaleway_object_bucket.tfstate.name
}

output "state_bucket_id" {
  description = "Regional ID of the state bucket ({region}/{name})"
  value       = scaleway_object_bucket.tfstate.id
}

output "state_bucket_endpoint" {
  description = "Endpoint URL of the state bucket"
  value       = scaleway_object_bucket.tfstate.endpoint
}

output "registry_endpoint" {
  description = "Docker-reachable host for the registry namespace (rg.{region}.scw.cloud/{name})"
  value       = scaleway_registry_namespace.backend.endpoint
}

output "registry_namespace_id" {
  description = "Regional ID of the registry namespace ({region}/{uuid})"
  value       = scaleway_registry_namespace.backend.id
}
