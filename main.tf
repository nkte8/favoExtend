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
}
