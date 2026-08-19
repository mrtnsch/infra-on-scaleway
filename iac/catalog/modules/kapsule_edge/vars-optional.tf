variable "custom_hostname" {
  description = "Domain to serve the API on. Its CNAME must resolve to the pipeline's edge_cname_target before this unit is applied."
  type        = string
  default     = null
}

variable "origin_port" {
  description = "Inbound port of the Load Balancer frontend the CCM created for the Service"
  type        = number
  default     = 80
}

variable "waf_mode" {
  description = "WAF behaviour: disable, log_only (classify and log) or enable (block)"
  type        = string
  default     = "log_only"

  validation {
    condition     = contains(["disable", "log_only", "enable"], var.waf_mode)
    error_message = "waf_mode must be one of disable, log_only, enable."
  }
}

variable "waf_paranoia_level" {
  description = "How readily a request is classed as malicious, 1 (fewest false positives) to 4"
  type        = number
  default     = 1
}

variable "cache_fallback_ttl" {
  description = "Seconds Edge Services caches a response that carries no Cache-Control of its own; 0 disables it"
  type        = number
  default     = 0
}
