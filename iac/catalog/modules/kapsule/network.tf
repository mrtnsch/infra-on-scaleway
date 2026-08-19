################################################################################
# VPC — the k8s runtime's own, sharing nothing with the serverless one
################################################################################

# A second VPC rather than the backend module's: the two runtimes then cannot
# reach each other's database by construction, and abandoning this experiment
# is destroying units that nothing else depends on.
resource "scaleway_vpc" "main" {
  name = "${var.environment}-k8s-vpc"
}

# Carries three things: cluster nodes, the Load Balancer, and the database's
# private endpoint. The subnet must not collide with the backend module's
# 172.16.32.0/22 — same project, and one day possibly one VPC peering.
resource "scaleway_vpc_private_network" "main" {
  name   = "${var.environment}-k8s-pn"
  vpc_id = scaleway_vpc.main.id

  ipv4_subnet {
    subnet = var.private_network_subnet
  }
}
