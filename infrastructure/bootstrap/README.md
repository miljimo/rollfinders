# Bootstrap Layer

Bootstrap owns resources that must exist before remote Terraform state can be used:

- S3 backend buckets for `dev`, `staging`, and `production`
- backend bucket security controls and versioning

Run it with:

```bash
./scripts/bootstrap.sh
```

The executable Terraform for this layer lives in `terraform/bootstrap` and uses the shared S3 bucket module.
