################################################################################
# Kapsule — mutualized control plane, one node
################################################################################

resource "scaleway_k8s_cluster" "main" {
  name    = "${var.environment}-joke-api"
  type    = var.cluster_type
  version = var.kubernetes_version
  cni     = var.cni

  private_network_id = scaleway_vpc_private_network.main.id

  # false: destroying the cluster must not take the Load Balancer with it —
  # that one is this module's own resource, and OpenTofu deletes it itself.
  delete_additional_resources = false

  # Patch releases only, which is why `version` is a minor (x.y): with
  # auto_upgrade on, the API rejects a pinned patch version.
  auto_upgrade {
    enable                        = true
    maintenance_window_start_hour = var.maintenance_window_start_hour
    maintenance_window_day        = var.maintenance_window_day
  }
}

resource "scaleway_k8s_pool" "main" {
  cluster_id = scaleway_k8s_cluster.main.id
  name       = "${var.environment}-joke-api-pool"
  node_type  = var.node_type
  size       = var.pool_size

  # One node, replaced when it dies; scaling out is a later decision and would
  # need a second node before the autoscaler has anywhere to put a pod.
  autoscaling = false
  autohealing = true
}
