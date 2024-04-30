# bundling.tf
data "external" "bundle" {
  program = [
    "bash", "-c",
    "npx esbuild --bundle ${var.cloudflare_workers_script.entrypoint} --outfile=${var.cloudflare_workers_script.outfile} --format=esm --minify --sourcemap > /dev/null && echo \"{\\\"result\\\": \\\"ok\\\"}\""
  ]
  working_dir = "${path.root}/${var.cloudflare_workers_script.workdir}/"
}
