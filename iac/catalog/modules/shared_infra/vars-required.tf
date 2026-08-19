variable "state_bucket_name" {
  description = "Name of the Object Storage bucket holding the OpenTofu state files"
  type        = string
}

variable "registry_namespace_name" {
  description = "Name of the Container Registry namespace holding backend images"
  type        = string
}
