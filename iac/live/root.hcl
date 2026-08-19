locals {
  region       = "fr-par"
  state_bucket = "infra-on-scaleway-tfstate"
}

remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket = local.state_bucket
    key    = "${path_relative_to_include()}/tofu.tfstate"
    region = local.region

    # Object Storage is S3-compatible but not AWS: custom endpoint, and every
    # AWS-only preflight (STS check, region allowlist, account-id lookup) off.
    endpoints                   = { s3 = "https://s3.${local.region}.scw.cloud" }
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    use_path_style              = true

    # Locking via S3 conditional writes — no lock table needed.
    use_lockfile = true
  }
}

generate "providers" {
  path      = "providers.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<PROVIDERS
provider "scaleway" {
  region = "${local.region}"
  zone   = "${local.region}-1"
}
PROVIDERS
}
