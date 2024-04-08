# valiable.tf
variable "upstash_email" {
  type = string
}

variable "upstash_api_key" {
  type = string
}

variable "upstash_db" {
  type = map
  default = {
    name = "extendfavorite-db",
    region = "ap-northeast-1",
    tls = true,
    eviction = true,
  }
}
