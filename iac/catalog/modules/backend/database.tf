################################################################################
# Managed PostgreSQL — private endpoint only
################################################################################

# Scaleway rejects passwords that miss any class: 8-128 chars, >=1 lower,
# >=1 upper, >=1 digit, >=1 special. override_special is the intersection of
# Scaleway's allowed specials with characters that stay safe in a URL, a shell
# and a .env file, so the value can be pasted anywhere without escaping.
resource "random_password" "db_admin" {
  length           = 32
  override_special = "-_.+="
  min_lower        = 1
  min_upper        = 1
  min_numeric      = 1
  min_special      = 1
}

resource "random_password" "db_app" {
  length           = 32
  override_special = "-_.+="
  min_lower        = 1
  min_upper        = 1
  min_numeric      = 1
  min_special      = 1
}

resource "scaleway_rdb_instance" "main" {
  name      = "${var.environment}-joke-api-db"
  node_type = var.db_node_type
  engine    = var.db_engine
  user_name = var.db_admin_username
  password  = random_password.db_admin.result

  is_ha_cluster             = var.db_ha
  backup_schedule_frequency = 24 # hours
  backup_schedule_retention = 7  # days
  volume_type               = "sbs_5k"
  volume_size_in_gb         = var.db_volume_size_gb # must be a multiple of 5

  # Opt-in on Scaleway; enabling it on an existing instance means a migration.
  encryption_at_rest = true

  # IPAM (not a static ip_net) is what registers the endpoint in VPC DNS —
  # without it the container cannot resolve or route to the database.
  private_network {
    pn_id       = scaleway_vpc_private_network.main.id
    enable_ipam = true
  }

  # No load_balancer block: with a private_network set and this omitted, the
  # API creates no public endpoint at all. That also makes an ACL pointless.
}

resource "scaleway_rdb_database" "main" {
  instance_id = scaleway_rdb_instance.main.id
  name        = var.db_name
}

# is_admin, not a plain user. Liquibase writes its changelog tables into the
# `public` schema (they cannot live in `jokes` — that schema does not exist
# until the first changeset runs), and on PostgreSQL 15+ a non-owner role has
# no CREATE there. rdb_privilege grants at the database level and does not
# reliably cover it. Admin also avoids the documented privilege drift, where
# the API reports `custom` once migrations create objects the grant predates.
resource "scaleway_rdb_user" "app" {
  instance_id = scaleway_rdb_instance.main.id
  name        = var.db_app_username
  password    = random_password.db_app.result
  is_admin    = true
}

resource "scaleway_rdb_privilege" "app" {
  instance_id   = scaleway_rdb_instance.main.id
  user_name     = scaleway_rdb_user.app.name
  database_name = scaleway_rdb_database.main.name
  permission    = "all"
}

locals {
  db_endpoint = scaleway_rdb_instance.main.private_network[0]

  # Prefer the IPAM-registered .internal record; fall back to the private IP if
  # the API leaves hostname empty. coalesce skips null and "".
  db_host = coalesce(local.db_endpoint.hostname, local.db_endpoint.ip)
  db_port = local.db_endpoint.port
}
