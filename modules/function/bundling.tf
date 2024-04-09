# bundling.tf
data "external" "bundle" {
  program = [
    "bash", "-c",
    "npx esbuild --bundle ${var.script.entrypoint} --outfile=${var.script.outfile} --format=esm --minify --sourcemap > /dev/null && echo \"{\\\"result\\\": \\\"ok\\\"}\""
  ]
  working_dir = "${path.root}/${var.script.workdir}/"
}
