resource "aws_db_subnet_group" "app" {
  name       = "${var.name_prefix}-db"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "app" {
  identifier                = "${var.name_prefix}-postgres"
  engine                    = "postgres"
  engine_version            = "16"
  instance_class            = var.db_instance_class
  allocated_storage         = 20
  max_allocated_storage     = 100
  db_name                   = var.db_name
  username                  = var.db_username
  password                  = var.db_password
  db_subnet_group_name      = aws_db_subnet_group.app.name
  vpc_security_group_ids    = var.security_group_ids
  storage_encrypted         = true
  backup_retention_period   = var.backup_retention_period
  deletion_protection       = var.is_production
  skip_final_snapshot       = !var.is_production
  final_snapshot_identifier = var.is_production ? "${var.name_prefix}-postgres-final" : null
  multi_az                  = var.multi_az
  publicly_accessible       = false
  apply_immediately         = !var.is_production
}
