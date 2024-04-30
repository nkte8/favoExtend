output "upstash_redis_endpoint" {
  value = upstash_redis_database.database.endpoint
}
output "upstash_redis_token" {
  value = upstash_redis_database.database.rest_token
}
