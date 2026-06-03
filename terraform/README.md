# RollFinder Terraform

This Terraform stack deploys RollFinder to AWS using ECS Fargate, an Application Load Balancer, ECR, RDS PostgreSQL, CloudWatch, Secrets Manager, S3, CloudFront, Route53, and IAM.

Supported environments:

- `dev`
- `staging`
- `production`

Bootstrap remote state once from `terraform/bootstrap`:

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

Then deploy an environment from `terraform`:

```bash
cd terraform
terraform init -backend-config=environments/dev/backend.tfvars -reconfigure
terraform plan -var-file=environments/dev/common.tfvars
terraform apply -var-file=environments/dev/common.tfvars
```

Production enables RDS deletion protection, final snapshots, and Multi-AZ. The CI scripts also require explicit production approval flags before deploys or migrations.
