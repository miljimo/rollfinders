data "aws_ami" "ami" {
  owners      = ["self", "amazon"]
  most_recent = true

  #https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "architecture"
    values = [var.architecture]
  }
  tags = {
    Name = "${var.branch_name}-${var.name}-ami"
  }
}

resource "aws_instance" "ec2" {
  ami                    = data.aws_ami.ami.id
  instance_type          = var.instance_type
  vpc_security_group_ids = var.security_group
  subnet_id              = var.subnet_id
  key_name               = var.key_name
  user_data              = var.user_data

  connection {
    host = null
    type = "ssh"
    user = var.username
  }
  # Root block device configuration
  root_block_device {
    volume_size           = var.volumn_size
    delete_on_termination = var.delete_rebs_on_termination
  }

  tags = {
    Name = "${var.branch_name}-${var.name}"
  }
}

resource "aws_ami" "ami" {
  count               = var.root_snap_id != null ? 1 : 0
  name                = "${var.branch_name}-${var.name}-ami"
  virtualization_type = "hvm"
  root_device_name    = "/dev/xvda"
  # Enforce usage of IMDSv2. You can safely 
  # remove this line if your application explicitly doesn't support it.  
  # imds_support        = "v2.0" 



  dynamic "ebs_block_device" {
    for_each = var.ebs_block_devices
    content {
      device_name = lookup(ebs_block_device.value, "device_name", "/dev/xvda")
      snapshot_id = lookup(ebs_block_device.value, "snapshot_id", var.root_snap_id)
      encrypted   = false
      volume_size = lookup(ebs_block_device.value, "volume_size", var.volumn_size)
    }
  }
  tags = {
    Name = "${var.branch_name}-${var.name}-ami"
  }
}