# valiable.tf

# database module
variable "upstash_api_key" {
  type = string
}

variable "cloudflare_api_token" {
  type = string
}

# function module
variable "upstash_email" {
  type = string
}

variable "upstash_db_name" {
  type = string
}

variable "upstash_db_region" {
  type = string
}
