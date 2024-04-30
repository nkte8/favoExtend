# route.tf
data "cloudflare_zone" "workers_domain" {
  count = var.cloudflare_workers_route_type != "disable" ? 1 : 0
  name  = var.cloudflare_workers_route.domain
}

resource "cloudflare_worker_route" "function_route" {
  count       = var.cloudflare_workers_route_type == "route" ? 1 : 0
  zone_id     = data.cloudflare_zone.workers_domain[0].id
  pattern     = var.cloudflare_workers_route.pattern
  script_name = cloudflare_worker_script.function.name

  depends_on = [cloudflare_worker_script.function]
}

resource "cloudflare_worker_domain" "function_domain" {
  count      = var.cloudflare_workers_route_type == "domain" ? 1 : 0
  account_id = var.cloudflare_account_id
  hostname   = var.cloudflare_workers_route.custom_domain
  service    = cloudflare_worker_script.function.name
  zone_id    = data.cloudflare_zone.workers_domain[0].id

  depends_on = [cloudflare_worker_script.function]
}
