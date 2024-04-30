# script.tf
resource "cloudflare_worker_script" "function" {
  account_id = var.cloudflare_account_id
  name       = var.cloudflare_workers_name
  content    = file("${path.root}/${var.cloudflare_workers_script.workdir}/${var.cloudflare_workers_script.outfile}")
  module     = true
  depends_on = [data.external.bundle]

  plain_text_binding {
    name = "CORS_ALLOW_ORIGIN"
    text = var.cloudflare_workers_env.cors_allow_origin
  }
  secret_text_binding {
    name = "UPSTASH_REDIS_REST_URL"
    text = var.cloudflare_workers_env.upstash_redis_rest_url
  }
  secret_text_binding {
    name = "UPSTASH_REDIS_REST_TOKEN"
    text = var.cloudflare_workers_env.upstash_redis_rest_token
  }
}
