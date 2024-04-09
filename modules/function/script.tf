# script.tf
resource "cloudflare_worker_script" "function" {
  account_id = var.cloudflare_account_id
  name       = var.cloudflare_worker_name
  content    = file("${path.root}/${var.script.workdir}/${var.script.outfile}")
  module     = true
  depends_on = [data.external.bundle]
}
