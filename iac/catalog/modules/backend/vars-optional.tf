variable "image_name" {
  description = "Image name inside the registry namespace"
  type        = string
  default     = "joke-api"
}

variable "custom_hostname" {
  description = "Custom domain to bind, e.g. api.dev.example.com. Its CNAME must already resolve to container_cname_target."
  type        = string
  default     = null
}

variable "private_network_subnet" {
  description = "IPv4 CIDR of the environment's Private Network"
  type        = string
  default     = "172.16.32.0/22"
}

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

variable "db_pool_size" {
  description = "Hikari maximum pool size per container instance, overriding application-prod.yaml"
  type        = number
  default     = 10
}

variable "min_scale" {
  description = "Minimum container instances; 1 keeps a warm instance and avoids cold starts"
  type        = number
  default     = 1
}

variable "max_scale" {
  description = "Maximum container instances"
  type        = number
  default     = 3
}

variable "concurrent_requests_threshold" {
  description = "Concurrent requests per instance before scaling out"
  type        = number
  default     = 50
}
