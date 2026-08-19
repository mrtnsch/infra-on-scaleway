variable "region" {
  description = "Scaleway region the bucket lives in"
  type        = string
  default     = "fr-par"
}

variable "state_version_retention_days" {
  description = "Days to keep noncurrent state file versions before expiring them"
  type        = number
  default     = 90
}

variable "edge_services_plan" {
  description = "Edge Services subscription tier; starter covers one pipeline and 100 GB of cache egress"
  type        = string
  default     = "starter"
}
