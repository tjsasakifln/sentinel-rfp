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

# Copy package.json files from all workspaces
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/ai/package.json ./packages/ai/package.json

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ===================================================================
# Builder stage - Build the application
# ===================================================================
FROM deps AS builder

# Copy source code
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/ai ./packages/ai

# Generate Prisma Client
RUN cd packages/database && pnpm prisma generate

# Build the API application using Turborepo
RUN pnpm turbo build --filter=@sentinel-rfp/api

# ===================================================================
# Production dependencies stage - Install only production dependencies
# ===================================================================
FROM base AS prod-deps

# Copy package.json files
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/ai/package.json ./packages/ai/package.json

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma Client in production mode
COPY packages/database/prisma ./packages/database/prisma
RUN cd packages/database && pnpm prisma generate

# ===================================================================
# Runtime stage - Final production image
# ===================================================================
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/packages/ai/node_modules ./packages/ai/node_modules

# Copy Prisma generated client
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/package.json

# Copy necessary workspace files
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs pnpm-workspace.yaml ./

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/api/dist/main.js"]
