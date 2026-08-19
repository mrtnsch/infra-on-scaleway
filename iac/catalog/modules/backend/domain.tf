################################################################################
# Custom domain
################################################################################

# Scaleway checks that the hostname already CNAMEs to the container before it
# runs the Let's Encrypt HTTP-01 challenge. Since the CNAME target is the
# container's generated endpoint, it cannot be created ahead of the container —
# the first apply is expected to fail here. The provider retries CreateDomain
# every 5s for 10 minutes while the API answers "could not validate domain", so
# a failure leaves nothing behind: no binding in Scaleway, none in state.
resource "scaleway_container_domain" "backend" {
  count        = var.custom_hostname == null ? 0 : 1
  container_id = scaleway_container.backend.id
  hostname     = var.custom_hostname
}
