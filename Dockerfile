# ==========================================================
# Base image
# ==========================================================
FROM node:18-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ==========================================================
# Install dependencies
# ==========================================================
FROM node:18-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps && npm cache clean --force

# ==========================================================
# Build stage
# ==========================================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Copy project
COPY . .

# Prisma client
RUN npx prisma generate

# Build (env vars are NOT hardcoded—Coolify injects them at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ==========================================================
# Production runner
# ==========================================================
FROM node:18-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init curl

# Non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Standalone server files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
