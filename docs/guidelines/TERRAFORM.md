## Terraform

Infrastructure must be created using reusable Terraform modules.

### Core Rule

The agent must not create cloud resources directly in the root Terraform environment unless there is a clear reason.

Instead, the agent must:

1. Create or update a reusable module under `./modules/<resource-name>/`
2. Define the resource inside the module
3. Expose required inputs using `variables.tf`
4. Expose useful outputs using `outputs.tf`
5. Use the module from the environment/root Terraform files

Example structure:

```text
terraform/
  modules/
    s3/
      main.tf
      variables.tf
      outputs.tf
      README.md
  environments/
    dev/
      main.tf
      variables.tf
      outputs.tf
    prod/
      main.tf
      variables.tf
      outputs.tf
```

### Example: S3 Module

The agent should create:

```text
terraform/modules/s3/
  main.tf
  variables.tf
  outputs.tf
  README.md
```

The S3 bucket resource should live inside:

```text
terraform/modules/s3/main.tf
```

Then the environment should use it like this:

```hcl
module "video_upload_bucket" {
  source = "../../modules/s3"

  bucket_name = "rollfinders-dev-video-uploads"
  environment = "dev"
}
```

### Module Design Requirements

Every Terraform module must be reusable and configurable.

A module should:

* Use clear input variables
* Avoid hard-coded environment names
* Avoid hard-coded project-specific values unless required
* Support tagging/labels
* Expose important outputs
* Include sensible low-cost defaults
* Be safe to use in dev, staging, and production
* Keep resource names predictable
* Include a short `README.md` explaining usage

### Required Module Files

Each module should normally include:

```text
main.tf       # resources
variables.tf  # input variables
outputs.tf    # output values
README.md     # usage notes
```

Optional files:

```text
locals.tf      # reusable naming/tag logic
versions.tf    # provider/module requirements if needed
data.tf        # data sources if needed
```

### Avoid

The agent must avoid:

* Creating one-off Terraform resources directly in environment files
* Duplicating the same resource logic across dev, staging, and production
* Hard-coding account IDs, regions, bucket names, or environment names
* Creating expensive resources by default
* Creating NAT resources unless explicitly approved
* Over-provisioning databases
* Building modules that only work for one environment

### Human Approval

The agent must request human approval before adding modules that create expensive or always-on infrastructure, such as:

* NAT Gateway
* Provisioned databases
* Load balancers
* Kubernetes clusters
* Large compute instances
* Multi-AZ production infrastructure
* Paid monitoring or logging services

### Summary

Terraform infrastructure must be module-driven.

The correct pattern is:

```text
Create reusable module → expose variables and outputs → use module from environment
```

The agent should design modules as reusable building blocks, not one-off scripts.
