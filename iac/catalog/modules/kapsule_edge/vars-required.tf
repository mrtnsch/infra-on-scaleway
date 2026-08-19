variable "pipeline_id" {
  description = "Edge Services pipeline, from the kapsule-edge-deps unit"
  type        = string
}

variable "lb_id" {
  description = "Zoned ID ({zone}/{uuid}) of the Load Balancer the cluster's Service is bound to, from the kapsule unit"
  type        = string
}
