output "cluster_id" {
  description = "Regional ID of the cluster ({region}/{uuid})"
  value       = scaleway_k8s_cluster.main.id
}

output "cluster_url" {
  description = "URL of the Kubernetes API server"
  value       = scaleway_k8s_cluster.main.apiserver_url
}

output "kubeconfig" {
  description = "Raw kubeconfig for the cluster; `scw k8s kubeconfig install` is the everyday path"
  value       = scaleway_k8s_cluster.main.kubeconfig[0].config_file
  sensitive   = true
}

output "lb_id" {
  description = "Zoned ID of the Load Balancer ({zone}/{uuid}); the value of the Service's scw-loadbalancer-id annotation"
  value       = scaleway_lb.main.id
}

output "lb_ip" {
  description = "Public IPv4 of the Load Balancer"
  value       = scaleway_lb.main.ip_address
}

output "pn_id" {
  description = "Private Network the database attaches to"
  value       = scaleway_vpc_private_network.main.id
}

output "vpc_id" {
  description = "ID of the k8s runtime's VPC"
  value       = scaleway_vpc.main.id
}
