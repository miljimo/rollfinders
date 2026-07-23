data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_iam_role" "host" {
  name = "${var.name_prefix}-ec2-app-host"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.host.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.host.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "read_app_parameters" {
  name = "${var.name_prefix}-read-app-parameters"
  role = aws_iam_role.host.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = concat(var.ssm_parameter_arns, [
          "arn:aws:ssm:*:*:parameter/${var.name_prefix}/app",
          "arn:aws:ssm:*:*:parameter/${var.name_prefix}/app/*",
          "arn:aws:ssm:*:*:parameter/${var.name_prefix}/super-admin",
          "arn:aws:ssm:*:*:parameter/${var.name_prefix}/super-admin/*"
        ])
      }
    ]
  })
}

resource "aws_iam_instance_profile" "host" {
  name = "${var.name_prefix}-ec2-app-host"
  role = aws_iam_role.host.name
}

resource "aws_instance" "host" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  iam_instance_profile        = aws_iam_instance_profile.host.name
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = var.security_group_ids
  associate_public_ip_address = true
  user_data_replace_on_change = true

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = <<-USERDATA
    #!/bin/bash
    set -euxo pipefail
    systemctl enable --now amazon-ssm-agent || true
    dnf update -y
    dnf install -y docker amazon-ssm-agent awscli
    systemctl enable --now docker
    systemctl enable --now amazon-ssm-agent
    usermod -aG docker ec2-user
    mkdir -p /usr/local/lib/docker/cli-plugins
    compose_arch="$(uname -m)"
    curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-$${compose_arch}" -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    mkdir -p /opt/rollfinder
  USERDATA

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-app-host"
  })
}
