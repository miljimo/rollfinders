moved {
  from = aws_eip.nat
  to   = aws_eip.nat[0]
}

moved {
  from = aws_nat_gateway.main
  to   = aws_nat_gateway.main[0]
}
