# Client-only Dockerfile for S3/CloudFront deployment
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Build client
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build only the client
RUN npm run build

# Production image with nginx for serving static files
FROM nginx:alpine AS runner

# Copy built client files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy client shared files
COPY --from=builder /app/shared /usr/share/nginx/html/shared

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 