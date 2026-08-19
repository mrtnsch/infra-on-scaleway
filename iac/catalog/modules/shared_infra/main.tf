################################################################################
# Object Storage — OpenTofu state bucket
################################################################################

# Bootstrapped out-of-band with `scw object bucket create`, then imported here.
resource "scaleway_object_bucket" "tfstate" {
  name   = var.state_bucket_name
  region = var.region

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "expire-old-state-versions"
    enabled = true

    noncurrent_version_expiration {
      noncurrent_days = var.state_version_retention_days
    }
  }

  lifecycle_rule {
    id                                     = "abort-incomplete-uploads"
    enabled                                = true
    abort_incomplete_multipart_upload_days = 7
  }

  lifecycle {
    prevent_destroy = true
  }
}
