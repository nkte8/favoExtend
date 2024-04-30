# provider.tf
terraform {
  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = "1.5.3"
    }
  }
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}