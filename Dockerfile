# ==========================================================
# Base image (Alpine)
# ==========================================================
FROM node:18-alpine AS base
WORKDIR /app

# ==========================================================
# Dependencies stage
# ==========================================================
FROM node:18-alpine AS deps
WORKDIR /app

# Alpine compatibility library
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci && npm cache clean --force

# ==========================================================
# Builder stage
# ==========================================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy entire project
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build environment variables (passed at build time)
ARG NEXT_PUBLIC_APP_URL
ARG DATABASE_URL
ARG OPENROUTER_API_KEY
ARG JWT_SECRET
ARG ENCRYPTION_KEY
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
ENV DATABASE_URL=${DATABASE_URL}
ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
ENV JWT_SECRET=${JWT_SECRET}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}

# Build Next.js
RUN npm run build

# ==========================================================
# Production runner stage
# ==========================================================
FROM node:18-alpine AS runner
WORKDIR /app

# Install runtime packages
RUN apk add --no-cache dumb-init curl

# Create non-root user (fully Alpine compatible)
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./app
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json

USER nextjs

# Health check endpoint used by Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start Next.js standalone server
CMD ["node", "app/server.js"]
