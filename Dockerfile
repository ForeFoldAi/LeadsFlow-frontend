# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args for env vars (passed at build time)
ARG VITE_API_BASE_URL
ARG VITE_LEAD_GENERATOR_URL
ARG VITE_APP_NAME=LeadsFlow
ARG VITE_NODE_ENV=production

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_LEAD_GENERATOR_URL=$VITE_LEAD_GENERATOR_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_NODE_ENV=$VITE_NODE_ENV

RUN npm run build


# ── Runtime stage (nginx) ─────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
