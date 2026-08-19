resource "scaleway_object_bucket" "site" {
  name   = var.bucket_name
  region = var.region

  # dist/ is a build artifact — rebuilt, never recovered.
  force_destroy = true

  lifecycle_rule {
    id                                     = "abort-incomplete-uploads"
    enabled                                = true
    abort_incomplete_multipart_upload_days = 7
  }
}

resource "scaleway_object_bucket_website_configuration" "site" {
  bucket = scaleway_object_bucket.site.name

  index_document {
    suffix = "index.html"
  }

  # SPA fallback: every client-side route is resolved by the app.
  error_document {
    key = "index.html"
  }
}

# Enabling website applies a public policy anyway; declaring it keeps the
# exposure in code. Version 2012-10-17 because an anonymous Principal = "*"
# only exists in that grammar.
resource "scaleway_object_bucket_policy" "public_read" {
  bucket = scaleway_object_bucket.site.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadForWebsite"
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject"]
      Resource  = ["${scaleway_object_bucket.site.name}/*"]
    }]
  })
}
