output "container_endpoint" {
  description = "Generated HTTPS endpoint of the backend container, including scheme"
  value       = scaleway_container.backend.public_endpoint
}

output "container_cname_target" {
  description = "Value to give the CNAME record at your registrar before setting custom_hostname"
  value       = "${trimprefix(scaleway_container.backend.public_endpoint, "https://")}."
}

output "custom_endpoint" {
  description = "HTTPS endpoint of the custom domain, null until custom_hostname is set"
  value       = var.custom_hostname == null ? null : "https://${var.custom_hostname}"
}

output "database_host" {
  description = "Private endpoint the container reaches the database on"
  value       = local.db_host
}

output "database_name" {
  description = "Name of the application database"
  value       = scaleway_rdb_database.main.name
}

output "vpc_id" {
  description = "ID of the environment's VPC"
  value       = scaleway_vpc.main.id
}
