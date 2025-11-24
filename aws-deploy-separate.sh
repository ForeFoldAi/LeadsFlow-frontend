#!/bin/bash

# AWS Deployment Script for Separate Client and Server
# This script deploys the client to S3+CloudFront and server to ECS

set -e

# Configuration
PROJECT_NAME="leadconnect"
AWS_REGION="us-east-1"
CLIENT_BUCKET_NAME="${PROJECT_NAME}-client-bucket"
SERVER_ECR_REPOSITORY_NAME="${PROJECT_NAME}-server-repo"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVER_SERVICE_NAME="${PROJECT_NAME}-server-service"
SERVER_TASK_DEFINITION_NAME="${PROJECT_NAME}-server-task"
LOAD_BALANCER_NAME="${PROJECT_NAME}-server-lb"
TARGET_GROUP_NAME="${PROJECT_NAME}-server-tg"
CLOUDFRONT_DISTRIBUTION_NAME="${PROJECT_NAME}-cf-distribution"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Separate AWS Deployment for LeadConnect...${NC}"

# Check prerequisites
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable is required.${NC}"
    echo "Please set it with your PostgreSQL connection string."
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Step 1: Deploy Client to S3 + CloudFront
echo -e "${YELLOW}🌐 Step 1: Deploying Client to S3 + CloudFront...${NC}"

# Create S3 bucket for client
aws s3 mb s3://${CLIENT_BUCKET_NAME} --region ${AWS_REGION} 2>/dev/null || echo "Bucket already exists"

# Configure S3 bucket for static website hosting
aws s3 website s3://${CLIENT_BUCKET_NAME} --index-document index.html --error-document index.html

# Build client
echo "Building client..."
npm run build:client

# Upload client files to S3
echo "Uploading client files to S3..."
aws s3 sync client/dist/ s3://${CLIENT_BUCKET_NAME} --delete

# Create CloudFront distribution
echo "Creating CloudFront distribution..."
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query 'Distribution.Id' --output text 2>/dev/null || \
  aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='${CLOUDFRONT_DISTRIBUTION_NAME}'].Id" --output text)

echo -e "${GREEN}✅ Client deployed to S3 + CloudFront!${NC}"

# Step 2: Deploy Server to ECS
echo -e "${YELLOW}🖥️  Step 2: Deploying Server to ECS...${NC}"

# Create ECR repository for server
aws ecr create-repository --repository-name ${SERVER_ECR_REPOSITORY_NAME} --region ${AWS_REGION} 2>/dev/null || echo "Repository already exists"

# Login to ECR
SERVER_ECR_REPOSITORY_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${SERVER_ECR_REPOSITORY_NAME}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${SERVER_ECR_REPOSITORY_URI}

# Build and push server image
echo "Building server Docker image..."
docker build -f Dockerfile.server -t ${PROJECT_NAME}-server .

docker tag ${PROJECT_NAME}-server:latest ${SERVER_ECR_REPOSITORY_URI}:latest
docker push ${SERVER_ECR_REPOSITORY_URI}:latest

echo -e "${GREEN}✅ Server Docker image pushed successfully!${NC}"

# Create ECS cluster
aws ecs create-cluster --cluster-name ${CLUSTER_NAME} --region ${AWS_REGION} 2>/dev/null || echo "Cluster already exists"

# Create server task definition
cat > server-task-definition.json << EOF
{
  "family": "${SERVER_TASK_DEFINITION_NAME}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "${PROJECT_NAME}-server-container",
      "image": "${SERVER_ECR_REPOSITORY_URI}:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:leadconnect/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${PROJECT_NAME}-server",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition --cli-input-json file://server-task-definition.json --region ${AWS_REGION}

# Create Application Load Balancer for server
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region ${AWS_REGION})
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query 'Subnets[0:2].SubnetId' --output text --region ${AWS_REGION})

# Create security group for server
SERVER_SECURITY_GROUP_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-server-sg \
  --description "Security group for ${PROJECT_NAME} server" \
  --vpc-id ${VPC_ID} \
  --region ${AWS_REGION} \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${PROJECT_NAME}-server-sg" \
  --query 'SecurityGroups[0].GroupId' --output text --region ${AWS_REGION})

# Add inbound rules for server
aws ec2 authorize-security-group-ingress \
  --group-id ${SERVER_SECURITY_GROUP_ID} \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0 \
  --region ${AWS_REGION} 2>/dev/null || true

# Create target group for server
SERVER_TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
  --name ${TARGET_GROUP_NAME} \
  --protocol HTTP \
  --port 3000 \
  --vpc-id ${VPC_ID} \
  --target-type ip \
  --health-check-path /api/health \
  --region ${AWS_REGION} \
  --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || \
  aws elbv2 describe-target-groups \
  --names ${TARGET_GROUP_NAME} \
  --region ${AWS_REGION} \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# Create load balancer for server
SERVER_LOAD_BALANCER_ARN=$(aws elbv2 create-load-balancer \
  --name ${LOAD_BALANCER_NAME} \
  --subnets ${SUBNET_IDS} \
  --security-groups ${SERVER_SECURITY_GROUP_ID} \
  --region ${AWS_REGION} \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || \
  aws elbv2 describe-load-balancers \
  --names ${LOAD_BALANCER_NAME} \
  --region ${AWS_REGION} \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Create listener for server
aws elbv2 create-listener \
  --load-balancer-arn ${SERVER_LOAD_BALANCER_ARN} \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=${SERVER_TARGET_GROUP_ARN} \
  --region ${AWS_REGION} 2>/dev/null || echo "Listener already exists"

# Create ECS service for server
cat > server-service-definition.json << EOF
{
  "cluster": "${CLUSTER_NAME}",
  "serviceName": "${SERVER_SERVICE_NAME}",
  "taskDefinition": "${SERVER_TASK_DEFINITION_NAME}",
  "loadBalancers": [
    {
      "targetGroupArn": "${SERVER_TARGET_GROUP_ARN}",
      "containerName": "${PROJECT_NAME}-server-container",
      "containerPort": 3000
    }
  ],
  "desiredCount": 2,
  "launchType": "FARGATE",
  "platformVersion": "LATEST",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["${SUBNET_IDS//\t/",\""}"],
      "securityGroups": ["${SERVER_SECURITY_GROUP_ID}"],
      "assignPublicIp": "ENABLED"
    }
  }
}
EOF

# Create server service
aws ecs create-service --cli-input-json file://server-service-definition.json --region ${AWS_REGION} 2>/dev/null || \
aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVER_SERVICE_NAME} --task-definition ${SERVER_TASK_DEFINITION_NAME} --region ${AWS_REGION}

echo -e "${GREEN}✅ Server deployed to ECS successfully!${NC}"

# Step 3: Get URLs
echo -e "${YELLOW}🌍 Step 3: Getting deployment URLs...${NC}"

CLIENT_URL=$(aws s3 website s3://${CLIENT_BUCKET_NAME} --query 'Endpoint' --output text)
SERVER_URL=$(aws elbv2 describe-load-balancers \
  --names ${LOAD_BALANCER_NAME} \
  --region ${AWS_REGION} \
  --query 'LoadBalancers[0].DNSName' --output text)

echo -e "${GREEN}🎉 Separate deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Client URL: http://${CLIENT_URL}${NC}"
echo -e "${GREEN}🖥️  Server API URL: http://${SERVER_URL}${NC}"
echo -e "${YELLOW}⏳ Please wait a few minutes for the services to be fully deployed.${NC}"

# Cleanup temporary files
rm -f server-task-definition.json server-service-definition.json cloudfront-config.json

echo -e "${GREEN}✅ Separate AWS deployment script completed!${NC}" 