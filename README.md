# favoExtend

This is backend-builder of Website favorite(like) and develop extend feature.

## Setup

### Register service

Create Accounts and publish tokens

- Upstash
  - Create API Key from [Management API](https://console.upstash.com/account/api)
- Cloudflare
  - Create API Token from [User API Token](https://dash.cloudflare.com/profile/api-tokens)
    - _NOT API Key_
  - Set allocation of...
    - Account-Worker Script-Edit

### Install terraform

Install terraform CLI. Reference is [here](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli).

### Prepair terraform.tfvars

Prepair `terraform.tfvars` file from `terraform.tfvars.template`

### Manage tfstate configuration

This product use R2 storage as tfstate backend.

If you use save tfstate on Cloudflare R2, you need to get R2 Access key, Access secret and endpoint url from `https://dash.cloudflare.com/<CLOUDFLARE_ACCOUNT_ID>/r2/api-tokens`

If you don't need to manage tfstate on Cloudflare R2, edit `provider.tf`, remove `backend "s3"` block.

```diff
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "1.5.3"
    }
  }
- backend "s3" {
-   bucket                      = "tfstate"
-   key                         = "extendfavorite.tfstate"
-   region                      = "auto"
-   skip_credentials_validation = true
-   skip_region_validation      = true
-   skip_requesting_account_id  = true
-   skip_metadata_api_check     = true
-   skip_s3_checksum            = true
- }
}
```

### Prepair terraform.tfbackend

After you got Access key, Access secret and endpoint url, edit `terraform.tfbackend` from `terraform.tfbackend.template`

If you manage tfstate on local, you don't need to setup `terraform.tfbackend`.

## Deploy extendfavorite

Initialize environment

```sh
terraform init -backend-config terraform.tfbackend
```

Plan deploy

```sh
terraform plan
```

Deploy

```sh
terraform apply
```

Destroy

```sh
terraform destroy
```

## Reference

[Install Terraform | Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
[Support Cloudflare r2 for storing Terraform state #33847](https://github.com/hashicorp/terraform/issues/33847#issuecomment-1854605813)
