# syntax=docker/dockerfile:1

# Base image with Node.js 20
FROM node:20-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY tsconfig.base.json tsconfig.json ./

# ===================================================================
# Dependencies stage - Install all dependencies
# ===================================================================
FROM base AS deps

# Install libc6-compat for compatibility with Next.js
RUN apk add --no-cache libc6-compat

# Copy package.json files from all workspaces
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ===================================================================
# Builder stage - Build the application
# ===================================================================
FROM deps AS builder

# Copy source code
COPY apps/web ./apps/web

# Set Next.js telemetry to disabled
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Web application using Turborepo
RUN pnpm turbo build --filter=@sentinel-rfp/web

# ===================================================================
# Runtime stage - Final production image
# ===================================================================
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set correct permissions for prerender cache
RUN mkdir -p ./apps/web/.next && chown nextjs:nodejs ./apps/web/.next

# Copy .next folder with static files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy package.json for metadata
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/package.json

# Switch to non-root user
USER nextjs

# Expose Web port
EXPOSE 3000

# Set environment variable for Next.js port
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application (standalone server is in root after COPY)
CMD ["node", "server.js"]
