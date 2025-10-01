# Frontend Dockerfile for Local SIM Colombia

# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy custom nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Set default backend URL (can be overridden by env var)
ENV BACKEND_URL=http://localhost:8001

# Expose port 80
EXPOSE 80

# Create startup script
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst "\$BACKEND_URL" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Start with custom script
CMD ["/docker-entrypoint.sh"]
