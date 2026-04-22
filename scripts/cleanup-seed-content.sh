#!/bin/bash
# ============================================
# MoviePlatform — Placeholder Content Cleanup
# Removes all seed content and products while preserving users
# Usage: ./scripts/cleanup-seed-content.sh
# ============================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Load env
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found!"
    exit 1
fi
set -a; source "$ENV_FILE"; set +a

POSTGRES_USER="${POSTGRES_USER:-movieplatform}"
POSTGRES_DB="${POSTGRES_DB:-movieplatform}"

echo "============================================"
echo "  MoviePlatform — Content Cleanup"
echo "============================================"

# 1. Backup
echo ""
echo "[1/5] Creating database backup..."
./scripts/backup.sh

# 2. Pre-flight check
echo ""
echo "[2/5] Current state..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT content_type, COUNT(*) FROM content GROUP BY content_type ORDER BY content_type;"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT COUNT(*) AS product_count FROM products;"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT COUNT(*) AS user_count FROM users;"

# 3. SQL cleanup (atomic transaction)
echo ""
echo "[3/5] Deleting all content and products..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'EOSQL'
BEGIN;

-- Null out content references in subscription_plans (no CASCADE on this FK)
UPDATE subscription_plans SET content_id = NULL WHERE content_id IS NOT NULL;

-- Delete all content (CASCADE handles: series, video_files, content_tags,
-- content_genres, watch_history, playlist_items, subscription_access)
DELETE FROM content;

-- Delete store products and related orders
DELETE FROM order_items WHERE product_id IN (SELECT id FROM products);
DELETE FROM orders WHERE id NOT IN (SELECT DISTINCT order_id FROM order_items);
DELETE FROM products;

-- Verify within transaction
SELECT 'content' AS tbl, COUNT(*) FROM content
UNION ALL SELECT 'series', COUNT(*) FROM series
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'users', COUNT(*) FROM users;

COMMIT;
EOSQL

# 4. MinIO cleanup
echo ""
echo "[4/5] Cleaning MinIO storage..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint sh minio-setup -c "
  mc alias set local http://minio:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD 2>/dev/null;
  mc rm --recursive --force local/videos/ 2>/dev/null || true;
  mc rm --recursive --force local/thumbnails/ 2>/dev/null || true;
  echo 'MinIO cleanup done';
"

# 5. Redis cache invalidation
echo ""
echo "[5/5] Invalidating Redis cache..."
docker compose -f "$COMPOSE_FILE" exec -T redis \
  redis-cli -a "${REDIS_PASSWORD:-}" --no-auth-warning KEYS 'mp-cache:*' | \
  xargs -r docker compose -f "$COMPOSE_FILE" exec -T redis \
  redis-cli -a "${REDIS_PASSWORD:-}" --no-auth-warning DEL 2>/dev/null || true

# Verification
echo ""
echo "============================================"
echo "  Verification"
echo "============================================"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT 'content' AS table_name, COUNT(*) FROM content
   UNION ALL SELECT 'series', COUNT(*) FROM series
   UNION ALL SELECT 'video_files', COUNT(*) FROM video_files
   UNION ALL SELECT 'products', COUNT(*) FROM products
   UNION ALL SELECT 'orders', COUNT(*) FROM orders
   UNION ALL SELECT 'users', COUNT(*) FROM users
   UNION ALL SELECT 'categories', COUNT(*) FROM categories
   UNION ALL SELECT 'product_categories', COUNT(*) FROM product_categories
   UNION ALL SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
   UNION ALL SELECT 'partner_levels', COUNT(*) FROM partner_levels
   UNION ALL SELECT 'legal_documents', COUNT(*) FROM legal_documents;"

echo ""
echo "============================================"
echo "  Cleanup complete!"
echo "  Content: 0, Products: 0, Users: preserved"
echo "============================================"
