# The pipeline comes from the kapsule-edge-deps unit and the Load Balancer from
# the kapsule unit; everything here hangs off the two. Stages point at the next
# one toward the origin: dns -> tls -> cache -> waf -> backend -> LB.

# The frontend is not an OpenTofu resource: the cloud controller manager creates
# it when the Service is reconciled, and Edge Services needs its ID to know
# which port to send traffic to. Reading it back is what makes this unit apply
# only after the first `//backend:k8s-deploy`.
data "scaleway_lb_frontends" "origin" {
  lb_id = var.lb_id
  zone  = local.lb_zone
}

locals {
  lb_zone = split("/", var.lb_id)[0]

  # null when the Service has not been deployed yet; the precondition below
  # turns that into a readable failure instead of an index error.
  origin_frontend_id = one([
    for f in data.scaleway_lb_frontends.origin.frontends : f.id
    if f.inbound_port == var.origin_port
  ])
}

resource "scaleway_edge_services_backend_stage" "api" {
  pipeline_id = var.pipeline_id

  lb_backend_config {
    lb_config {
      id          = var.lb_id
      frontend_id = local.origin_frontend_id
      zone        = local.lb_zone

      # The CCM's frontend is plain HTTP: TLS is terminated at the edge, and the
      # hop from there to the LB stays inside Scaleway's network.
      is_ssl = false
    }
  }

  # A backend stage pointing at a frontend that does not exist yet is accepted
  # by the API and then serves 502s, so fail here with the reason instead.
  lifecycle {
    precondition {
      condition     = local.origin_frontend_id != null
      error_message = "No Load Balancer frontend on port ${var.origin_port}: run `mise run //backend:k8s-deploy <tag>` first, then apply this unit."
    }
  }
}

# The reason this runtime exists. `log_only` classifies and logs without
# blocking, which is the only safe way to learn what the ruleset does to real
# traffic; flip var.waf_mode to `enable` once the log is clean.
resource "scaleway_edge_services_waf_stage" "api" {
  pipeline_id      = var.pipeline_id
  backend_stage_id = scaleway_edge_services_backend_stage.api.id
  mode             = var.waf_mode
  paranoia_level   = var.waf_paranoia_level
}

resource "scaleway_edge_services_cache_stage" "api" {
  pipeline_id  = var.pipeline_id
  waf_stage_id = scaleway_edge_services_waf_stage.api.id

  # An API, not a site: nothing is cached unless the response says so. Every
  # Joke API response carries no Cache-Control, so this is the value that
  # decides, and 0 keeps reads honest.
  fallback_ttl = var.cache_fallback_ttl
}

resource "scaleway_edge_services_tls_stage" "api" {
  count = var.custom_hostname == null ? 0 : 1

  pipeline_id         = var.pipeline_id
  cache_stage_id      = scaleway_edge_services_cache_stage.api.id
  managed_certificate = true
}

# Registering the FQDN is the one thing that needs the CNAME to already resolve,
# which is why kapsule-edge-deps is applied first.
resource "scaleway_edge_services_dns_stage" "api" {
  pipeline_id = var.pipeline_id
  fqdns       = var.custom_hostname == null ? null : [var.custom_hostname]

  # Link arguments are mutually exclusive, so exactly one is ever set. With no
  # domain the generated endpoint carries Scaleway's own certificate.
  tls_stage_id   = var.custom_hostname == null ? null : scaleway_edge_services_tls_stage.api[0].id
  cache_stage_id = var.custom_hostname == null ? scaleway_edge_services_cache_stage.api.id : null
}

resource "scaleway_edge_services_head_stage" "api" {
  pipeline_id   = var.pipeline_id
  head_stage_id = scaleway_edge_services_dns_stage.api.id
}
