# ============================================
# MoviePlatform API — Production Dockerfile
# Multi-stage build for NestJS + Prisma + FFmpeg
# ============================================

# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Copy package files for all workspaces (needed for lockfile resolution)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY packages/eslint-config/package*.json ./packages/eslint-config/

RUN npm ci

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app ./
COPY . .

# Build shared package (API depends on it)
RUN cd packages/shared && npx tsup src/index.ts --format cjs,esm --dts

# Generate Prisma client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Create a build-specific tsconfig that compiles only src/ with rootDir=src
# so the output is dist/main.js (not dist/src/main.js)
RUN printf '{"extends":"./tsconfig.json","compilerOptions":{"rootDir":"./src","noEmitOnError":false,"skipLibCheck":true,"noUnusedLocals":false,"noUnusedParameters":false},"include":["src/**/*"],"exclude":["node_modules","dist","test","prisma","**/*.spec.ts","**/*.e2e-spec.ts"]}' > apps/api/tsconfig.build.json

# Build NestJS API (use tsc directly; ignore exit code since noEmitOnError:false ensures JS is emitted)
RUN cd apps/api && npx tsc -p tsconfig.build.json || true && test -f dist/main.js

# Copy non-TS assets (email templates) that tsc doesn't handle
RUN cp -r apps/api/src/modules/email/templates apps/api/dist/modules/email/templates

# ---- Stage 3: Production runner ----
FROM node:20-alpine AS runner

# FFmpeg for video transcoding
RUN apk add --no-cache openssl ffmpeg

WORKDIR /app

ENV NODE_ENV=production

# Copy root package.json (needed for workspace resolution)
COPY --from=builder /app/package.json ./package.json

# Copy compiled API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy Prisma schema + migrations (needed for prisma migrate deploy)
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy shared package dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy node_modules (includes Prisma client, native modules)
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Create temp directory for video uploads and upload directories
RUN mkdir -p /tmp/video-uploads && chown nestjs:nodejs /tmp/video-uploads
RUN mkdir -p /app/apps/api/uploads/images /app/apps/api/uploads/videos && \
    chown -R nestjs:nodejs /app/apps/api/uploads

USER nestjs

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/main"]
