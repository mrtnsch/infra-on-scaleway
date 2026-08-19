variable "db_node_type" {
  description = "Managed Database node type"
  type        = string
  default     = "db-dev-s"
}

variable "db_engine" {
  description = "Managed Database engine and major version"
  type        = string
  default     = "PostgreSQL-17"
}

variable "db_ha" {
  description = "Run the database as a high-availability cluster"
  type        = bool
  default     = false
}

variable "db_volume_size_gb" {
  description = "Database volume size in GB; must be a multiple of 5"
  type        = number
  default     = 10
}

variable "db_name" {
  description = "Name of the application database"
  type        = string
  default     = "jokes"
}

variable "db_admin_username" {
  description = "Instance admin user; not used by the application"
  type        = string
  default     = "dbadmin"
}

variable "db_app_username" {
  description = "Database user the application connects as"
  type        = string
  default     = "joke_api"
}
