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

# Every module gets its provider requirements from here rather than carrying its
# own versions.tf — one place to bump a version, and no drift between modules.
# The trade-off: `tofu` run directly inside catalog/ has no provider source and
# will not init. Go through terragrunt.
generate "versions" {
  path      = "versions.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<VERSIONS
terraform {
  required_version = ">= 1.12"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.81"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
VERSIONS
}

# The state holds every generated secret (DB passwords, container secret envs),
# so it is encrypted client-side before it reaches the bucket. The unencrypted
# fallback reads state written before encryption existed; remove it once every
# unit has rewritten its state (any apply, -refresh-only is enough).
generate "state_encryption" {
  path      = "encryption.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<ENCRYPTION
variable "state_passphrase" {
  description = "Passphrase the state encryption key is derived from; set via TF_VAR_state_passphrase in .env.local"
  type        = string
  sensitive   = true
}

terraform {
  encryption {
    key_provider "pbkdf2" "state" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "state" {
      keys = key_provider.pbkdf2.state
    }

    method "unencrypted" "migrate" {}

    state {
      method = method.aes_gcm.state
      fallback {
        method = method.unencrypted.migrate
      }
    }

    plan {
      method = method.aes_gcm.state
    }
  }
}
ENCRYPTION
}
