removed {
  from = module.state_bucket

  lifecycle {
    destroy = false
  }
}
