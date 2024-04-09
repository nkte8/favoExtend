# valiable.tf
variable "cloudflare_api_token" {
  type = string
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_worker_name" {
  type = string
}

variable "script" {
  type = map(any)
  default = {
    outfile     = "dist/worker.js"
    entrypoint = "src/index.ts"
    workdir    = "api"
  }
}
