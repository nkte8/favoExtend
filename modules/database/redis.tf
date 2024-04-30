# redis.tf
resource "upstash_redis_database" "database" {
  database_name = var.upstash_db.name
  region        = var.upstash_db.region
  tls           = var.upstash_db.tls
  eviction      = var.upstash_db.eviction
}
