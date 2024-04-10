module "database" {
  source          = "./modules/database"
  upstash_email   = var.upstash_email
  upstash_api_key = var.upstash_api_key

  upstash_db = {
    name     = var.upstash_db_name,
    region   = var.upstash_db_region,
    tls      = true,
    eviction = true,
  }
}

module "function" {
  source               = "./modules/function"
  cloudflare_api_token = var.cloudflare_api_token

  cloudflare_account_id   = var.cloudflare_account_id
  cloudflare_workers_name = var.cloudflare_workers_name
  cloudflare_workers_env  = var.cloudflare_workers_env

  cloudflare_workers_route_type = var.cloudflare_workers_route_type
  cloudflare_workers_route = {
    pattern       = var.cloudflare_workers_route_pattern
    domain        = var.cloudflare_workers_route_domain
    custom_domain = var.cloudflare_workers_route_custom_domain
  }
}
