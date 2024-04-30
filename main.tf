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
  cloudflare_workers_env = {
    upstash_redis_rest_url   = format("https://%s", module.database.upstash_redis_endpoint)
    upstash_redis_rest_token = module.database.upstash_redis_token
    cors_allow_origin        = var.cloudflare_workers_cors_allow_origin
  }

  cloudflare_workers_route_type = var.cloudflare_workers_route_type
  cloudflare_workers_route = {
    pattern       = var.cloudflare_workers_route_pattern
    domain        = var.cloudflare_workers_route_domain
    custom_domain = var.cloudflare_workers_route_custom_domain
  }
}
