variable "private_network_subnet" {
  description = "IPv4 CIDR of the cluster's Private Network; must not overlap the serverless runtime's"
  type        = string
  default     = "172.16.36.0/22"
}

variable "kubernetes_version" {
  description = "Kubernetes minor version, e.g. 1.36; a patch version is rejected while auto-upgrade is on"
  type        = string
  default     = "1.36"
}

variable "cni" {
  description = "Container Network Interface for the cluster"
  type        = string
  default     = "cilium"
}

variable "cluster_type" {
  description = "Control plane type; kapsule is the mutualized (free) one"
  type        = string
  default     = "kapsule"
}

variable "node_type" {
  description = "Instance type of the pool's nodes"
  type        = string
  default     = "DEV1-M"
}

variable "pool_size" {
  description = "Number of nodes in the pool"
  type        = number
  default     = 1
}

variable "lb_type" {
  description = "Load Balancer offer"
  type        = string
  default     = "LB-S"
}

variable "maintenance_window_start_hour" {
  description = "Start hour (UTC) of the 2-hour auto-upgrade maintenance window"
  type        = number
  default     = 2
}

variable "maintenance_window_day" {
  description = "Day of the auto-upgrade maintenance window"
  type        = string
  default     = "sunday"
}
