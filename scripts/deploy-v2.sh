#!/bin/bash
# ============================================
# MoviePlatform — V2 side-by-side deployment
# Purpose: deploy a second stack in parallel with the existing one.
# Usage:
#   ./scripts/deploy-v2.sh
# Notes:
# - Expects to be run from a separate folder (e.g. ~/apps/movieplatform-v2)
# - Uses docker-compose.prod.v2.yml and .env.production
# ============================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.v2.yml"
ENV_FILE=".env.production"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Optional: MP_V2_HTTP_PORT=8082 ./scripts/deploy-v2.sh
export MP_V2_HTTP_PORT="${MP_V2_HTTP_PORT:-}"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  MoviePlatform — Deploying V2 (side-by-side)..."
echo "=========================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found!"
    echo "Copy .env.example to $ENV_FILE and configure it."
    exit 1
fi

echo ""
echo "[1/5] Pulling latest code..."
git pull origin main

echo ""
echo "[2/5] Building Docker images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo ""
echo "[3/5] Restarting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ""
echo "[3.1/5] Ensuring MinIO buckets exist..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm -T minio-setup

echo ""
echo "[3.2/5] Restarting nginx to refresh upstream DNS..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart nginx

echo ""
echo "[4/5] Waiting for API to start..."
sleep 10

echo ""
echo "[5/5] Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api npx prisma migrate deploy --schema=prisma/schema.prisma

echo ""
echo "=========================================="
echo "  V2 deployment complete!"
echo "=========================================="
echo ""
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
