/*
  This is the ECS Task execution role that the ECS agent and docker daemon will assume to pull images and create log groups
  References: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html

  // Make this more restrictive in future by providing specific bucket ARNs
      // "arn:aws:logs:${var.region}:${var.account_id}:log-group:/ecs/${var.environment}*"
      // "arn:aws:ecr:${var.region}:${var.account_id}:repository/${var.environment}*"
      // "arn:aws:s3:::${var.environment}-*"
*/
# Change to managed policies later
module "ecs_execution_role" {
  source      = "../roles"
  environment = var.environment
  name        = "${var.name}_execution_role"
  assume_role_principals = [
    {
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  ]
  # external_policies_arn = [
  #   "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceRole"
  # ]
  statements = concat([
    {
      id = "AllowECRandImagePull"
      actions = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ]
      resources = ["*"]
    },
    {
      id = "AllowCloudWatchLogsCreateLogGroup"
      actions = [
        "logs:CreateLogStream",
        "logs:CreateLogGroup",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      resources = ["*"]
    },
    {
      id = "AllowS3GetAndPutOperationsToECRFiles"
      actions = [
        "s3:GetObject",
        "s3:PutObject"
      ]
      resources = ["*"]
    }
    ],
    length(var.execution_role_secret_arns) > 0 ? [
      {
        id        = "AllowSecretsManagerRead"
        actions   = ["secretsmanager:GetSecretValue"]
        resources = var.execution_role_secret_arns
      }
    ] : [],
    length(var.execution_role_parameter_arns) > 0 ? [
      {
        id        = "AllowSsmParameterRead"
        actions   = ["ssm:GetParameters"]
        resources = var.execution_role_parameter_arns
      },
      {
        id        = "AllowSsmParameterDecrypt"
        actions   = ["kms:Decrypt"]
        resources = ["*"]
      }
  ] : [])
}








module "ecs_default_task_role" {
  count       = var.use_default_task_role ? 1 : 0
  source      = "../roles"
  environment = var.environment
  name        = "${var.name}_default_task_role"
  assume_role_principals = [
    {
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  ]
  statements = [

  ]
}
