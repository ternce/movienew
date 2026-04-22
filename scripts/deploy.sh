#!/bin/bash
# ============================================
# MoviePlatform — Deployment Script
# Usage: ./scripts/deploy.sh
# ============================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  MoviePlatform — Deploying..."
echo "=========================================="

# Check that env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found!"
    echo "Copy .env.example to $ENV_FILE and configure it."
    exit 1
fi

# Pull latest code
echo ""
echo "[1/5] Pulling latest code..."
git pull origin main

# Build images
echo ""
echo "[2/5] Building Docker images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

# Stop and recreate containers
echo ""
echo "[3/5] Restarting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for API to be healthy
echo ""
echo "[4/5] Waiting for API to start..."
sleep 10

# Run database migrations
echo ""
echo "[5/5] Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api npx prisma migrate deploy --schema=prisma/schema.prisma

# Show status
echo ""
echo "=========================================="
echo "  Deployment complete!"
echo "=========================================="
echo ""
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
echo ""
echo "Memory usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"
