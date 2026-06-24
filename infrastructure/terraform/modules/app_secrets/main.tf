locals {
  parameter_prefix = startswith(var.name, "/") ? var.name : "/${var.name}"
}

resource "aws_ssm_parameter" "app" {
  for_each = nonsensitive(toset(keys(var.secret_values)))

  name  = "${local.parameter_prefix}/${each.value}"
  type  = contains(var.secure_value_keys, each.value) ? "SecureString" : "String"
  value = var.secret_values[each.value]
  tags  = var.tags
}
