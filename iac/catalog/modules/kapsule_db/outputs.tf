# The deploy task turns these three into the pod's Secret; nothing in git ever
# holds them, and no value is copied by hand.
output "db_url" {
  description = "JDBC URL the pod connects with"
  value       = "jdbc:postgresql://${local.db_host}:${local.db_port}/${scaleway_rdb_database.main.name}"
}

output "db_username" {
  description = "Database user the application connects as"
  value       = scaleway_rdb_user.app.name
}

output "db_password" {
  description = "Password of the application database user"
  value       = random_password.db_app.result
  sensitive   = true
}

output "db_host" {
  description = "Private endpoint the pod reaches the database on"
  value       = local.db_host
}

output "db_name" {
  description = "Name of the application database"
  value       = scaleway_rdb_database.main.name
}
