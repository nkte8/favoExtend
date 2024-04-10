# valiable.tf

# database module
variable "upstash_api_key" {
  type = string
}

variable "upstash_email" {
  type = string
}

variable "upstash_db_name" {
  type = string
}

variable "upstash_db_region" {
  type = string
}

# function module

variable "cloudflare_api_token" {
  type = string
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_workers_name" {
  type = string
}

variable "cloudflare_workers_route_type" {
  type    = string
  default = "disable"
  validation {
    condition     = contains(["disable", "route", "domain"], var.cloudflare_workers_route_type)
    error_message = "Allowed values for cloudflare_workers_route_type are \"disable\", \"route\", or \"domain\"."
  }
}

variable "cloudflare_workers_route_domain" {
  type    = string
  default = ""
}

variable "cloudflare_workers_route_custom_domain" {
  type    = string
  default = ""
}

variable "cloudflare_workers_route_pattern" {
  type    = string
  default = "workers/api"
}

variable "cloudflare_workers_env" {
  type = map(string)
  default = {
    upstash_redis_rest_url   = "https://example.upstash.io"
    upstash_redis_rest_token = "XXXXXXXXX"
    cors_allow_origin        = "*"
  }
}
