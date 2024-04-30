# valiable.tf
variable "cloudflare_api_token" {
  type = string
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_workers_name" {
  type = string
}

variable "cloudflare_workers_script" {
  type = map(string)
  default = {
    outfile    = "dist/worker.js"
    entrypoint = "src/index.ts"
    workdir    = "api"
  }
}

variable "cloudflare_workers_route_type" {
  type    = string
  default = "disable"
  validation {
    condition     = contains(["disable", "route", "domain"], var.cloudflare_workers_route_type)
    error_message = "Allowed values for cloudflare_workers_route_type are \"disable\", \"route\", or \"domain\"."
  }
}

variable "cloudflare_workers_route" {
  type = map(string)
  default = {
    domain        = "example.com"
    pattern       = "example.com/workers/api"
    custom_domain = "api.example.com"
  }
}

variable "cloudflare_workers_env" {
  type = map(string)
  default = {
    upstash_redis_rest_url   = "https://example.upstash.io"
    upstash_redis_rest_token = "XXXXXXXXX"
    cors_allow_origin        = "*"
  }
}
