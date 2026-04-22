# ============================================
# MoviePlatform Web — Production Dockerfile
# Multi-stage build for Next.js standalone output
# ============================================

# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for all workspaces (needed for lockfile resolution)
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/

RUN npm ci

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app ./
COPY . .

# Build shared package (web depends on it)
RUN cd packages/shared && npx tsup src/index.ts --format cjs,esm --dts

# Build Next.js with standalone output
# Environment variables needed at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=apps/web

# ---- Stage 3: Production runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy standalone server (includes only required node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone server entry point is at apps/web/server.js
CMD ["node", "apps/web/server.js"]
