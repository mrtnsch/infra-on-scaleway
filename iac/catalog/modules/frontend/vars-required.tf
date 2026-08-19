variable "bucket_name" {
  description = "Name of the Object Storage bucket holding dist/; globally unique per region"
  type        = string
}

variable "pipeline_id" {
  description = "Edge Services pipeline, from the frontend_deps module"
  type        = string
}
