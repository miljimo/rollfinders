# AWS ROLE MODULE


```json

module "lambda_role_example" {
  source      = "./modules/roles"
  name        = "access-database-role"
  environment = var.environment_name
  assume_role_principals = [
    {
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  ]
}
```