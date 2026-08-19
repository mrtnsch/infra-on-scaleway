# The pipeline itself comes from the frontend_deps unit; everything here hangs
# off it. Stages point at the next one toward the origin.
resource "scaleway_edge_services_backend_stage" "site" {
  pipeline_id = var.pipeline_id

  s3_backend_config {
    bucket_name   = scaleway_object_bucket.site.name
    bucket_region = var.region

    # Talk to the website endpoint, so the error document applies to CDN traffic.
    is_website = true
  }

  # Only the bucket name is referenced, so the website config needs an edge.
  depends_on = [scaleway_object_bucket_website_configuration.site]
}

resource "scaleway_edge_services_cache_stage" "site" {
  pipeline_id      = var.pipeline_id
  backend_stage_id = scaleway_edge_services_backend_stage.site.id

  # Floor for objects with no Cache-Control; an explicit directive always wins.
  fallback_ttl = var.cache_fallback_ttl
}

# Gated so an environment can serve on the generated endpoint with no domain.
resource "scaleway_edge_services_tls_stage" "site" {
  count = var.custom_hostname == null ? 0 : 1

  pipeline_id         = var.pipeline_id
  cache_stage_id      = scaleway_edge_services_cache_stage.site.id
  managed_certificate = true
}

resource "scaleway_edge_services_dns_stage" "site" {
  pipeline_id = var.pipeline_id
  fqdns       = var.custom_hostname == null ? null : [var.custom_hostname]

  # Link arguments are mutually exclusive, so exactly one is ever set.
  tls_stage_id   = var.custom_hostname == null ? null : scaleway_edge_services_tls_stage.site[0].id
  cache_stage_id = var.custom_hostname == null ? scaleway_edge_services_cache_stage.site.id : null
}

resource "scaleway_edge_services_head_stage" "site" {
  pipeline_id   = var.pipeline_id
  head_stage_id = scaleway_edge_services_dns_stage.site.id
}
