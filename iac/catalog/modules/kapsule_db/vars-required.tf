variable "environment" {
  description = "Environment name, used as the prefix for every resource"
  type        = string
}

variable "pn_id" {
  description = "Private Network the database's endpoint is created on, from the kapsule module"
  type        = string
}
