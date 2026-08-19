variable "region" {
  description = "Scaleway region the bucket lives in"
  type        = string
  default     = "fr-par"
}

variable "custom_hostname" {
  description = "Domain to serve the site on. Its CNAME must resolve to frontend_deps' edge_cname_target before this unit is applied."
  type        = string
  default     = null
}

variable "cache_fallback_ttl" {
  description = "Seconds Edge Services caches an object that carries no Cache-Control of its own"
  type        = number
  default     = 3600
}
