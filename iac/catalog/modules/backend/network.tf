################################################################################
# VPC — one per environment, so dev and prod are network-isolated
################################################################################

resource "scaleway_vpc" "main" {
  name = "${var.environment}-vpc"
}

# The container and the database both attach here; it is the only path between
# them, which is what keeps the database off the internet.
resource "scaleway_vpc_private_network" "main" {
  name   = "${var.environment}-pn"
  vpc_id = scaleway_vpc.main.id

  ipv4_subnet {
    subnet = var.private_network_subnet
  }
}
