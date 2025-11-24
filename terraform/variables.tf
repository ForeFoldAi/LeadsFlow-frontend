variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "database_url" {
  description = "PostgreSQL database connection URL (not needed for client)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "leadconnect-client"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
} 