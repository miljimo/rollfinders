# RollFinders Terraform

This Terraform stack deploys RollFinders to AWS using ECS Fargate, an Application Load Balancer, ECR, RDS PostgreSQL, CloudWatch, Secrets Manager, S3, CloudFront, Route53, and IAM.

Supported environments:

- `dev`
- `staging`
- `production`

Bootstrap remote state once from `terraform/bootstrap`:

```bash
./scripts/cicd/bootstrap-state.sh
```

Then deploy an environment from `terraform`:

```bash
cd terraform
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
terraform init \
  -backend-config=environments/dev/backend.tfvars \
  -backend-config="bucket=rollfinder-${AWS_ACCOUNT_ID}-terraform-artefact" \
  -backend-config="key=dev/terraform.tfstate" \
  -reconfigure
terraform plan -var-file=environments/dev/common.tfvars
terraform apply -var-file=environments/dev/common.tfvars
```

Environment-specific non-secret values, such as `domain_name` and `hosted_zone_name`, live in each environment's `common.tfvars` file. Terraform discovers the Route53 hosted zone, creates the ACM certificate, validates it through DNS, and creates the frontend/API DNS records. Bitbucket deployment variables should be reserved for AWS credentials and secrets such as `TF_VAR_nextauth_secret`.

The shared Terraform artefact bucket uses the name `rollfinder-<AWS_ACCOUNT_ID>-terraform-artefact`. Environment state is separated by S3 key prefixes: `dev/terraform.tfstate`, `staging/terraform.tfstate`, and `production/terraform.tfstate`.

The bootstrap stack passes `environment_name = "rollfinder"` and `name = "terraform-artefact"` into the S3 module; the module appends the AWS account ID when it creates the physical bucket name.

Production enables RDS deletion protection, final snapshots, and Multi-AZ. The CI scripts also require explicit production approval flags before deploys or migrations.
