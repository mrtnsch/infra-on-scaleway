################################################################################
# Load Balancer — created here, configured by the cloud controller manager
################################################################################

# Kept out of Kubernetes so its ID is a plain unit output: the Edge unit reads
# it from state like any other dependency instead of a value pasted between
# applies. The Service adopts it with the `scw-loadbalancer-id` annotation.
resource "scaleway_lb_ip" "main" {}

resource "scaleway_lb" "main" {
  name   = "${var.environment}-joke-api-k8s"
  type   = var.lb_type
  ip_ids = [scaleway_lb_ip.main.id]

  # The CCM attaches the cluster's Private Network itself; declaring it means
  # the attachment is created here, and the CCM finds it and moves on.
  private_network {
    private_network_id = scaleway_vpc_private_network.main.id
  }

  # The CCM rewrites this to its default whenever the Service is reconciled, so
  # OpenTofu states the same value rather than fighting it.
  ssl_compatibility_level = "ssl_compatibility_level_intermediate"

  lifecycle {
    # Frontends, backends and ACLs are separate API objects and never show up
    # here; tags are the one field the CCM may write on the LB itself.
    ignore_changes = [tags]
  }
}
