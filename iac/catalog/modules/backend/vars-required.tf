variable "environment" {
  description = "Environment name, used as the prefix for every resource"
  type        = string
}

variable "registry_endpoint" {
  description = "Docker-reachable registry host, from the shared_infra module"
  type        = string
}

variable "image_tag" {
  description = "Tag of the backend image to deploy; bump after pushing a new build"
  type        = string
}
