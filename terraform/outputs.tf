output "s3_bucket_name" {
  description = "Name of the S3 bucket for client static files"
  value       = aws_s3_bucket.client.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.client.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.client.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.client.domain_name
}

output "website_endpoint" {
  description = "S3 website endpoint"
  value       = aws_s3_bucket_website_configuration.client.website_endpoint
}

output "deployment_user_name" {
  description = "Name of the IAM user for deployment"
  value       = aws_iam_user.client_deployer.name
}

output "deployment_user_arn" {
  description = "ARN of the IAM user for deployment"
  value       = aws_iam_user.client_deployer.arn
} 