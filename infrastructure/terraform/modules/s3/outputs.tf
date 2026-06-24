output "arn" {
  value = aws_s3_bucket.bucket.bucket
}

output "id" {
  value = aws_s3_bucket.bucket.id
}

output "name" {
  value = aws_s3_bucket.bucket.bucket
}

output "website_domain" {
  value = length(aws_s3_bucket_website_configuration.website_configuration) > 0 ? aws_s3_bucket_website_configuration.website_configuration[0].website_domain : null

}

output "website_endpoint" {
  value = length(aws_s3_bucket_website_configuration.website_configuration) > 0 ? aws_s3_bucket_website_configuration.website_configuration[0].website_endpoint : null

}

output "hosted_zone_id" {
  value = aws_s3_bucket.bucket.hosted_zone_id
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.bucket.bucket_regional_domain_name
}
