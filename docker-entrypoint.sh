#!/bin/sh
set -e

echo "===================================================="
echo " Starting Digital Ledger Application in Container   "
echo "===================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "==> Database target configured: checking connectivity..."
  max_retries=30
  count=0

  until prisma db push --schema=prisma/schema.prisma --skip-generate; do
    count=$((count + 1))
    if [ "$count" -ge "$max_retries" ]; then
      echo "==> ERROR: Timed out waiting for database connection."
      exit 1
    fi
    echo "==> Database not ready yet (attempt $count/$max_retries). Waiting 2s..."
    sleep 2
  done

  echo "==> Prisma schema successfully synchronized."

  if [ "$AUTO_SEED" = "true" ]; then
    echo "==> AUTO_SEED is enabled: seeding demo data..."
    node prisma/seed.js || echo "==> Seeding step finished."
  fi
else
  echo "==> WARNING: DATABASE_URL is not set. Skipping schema synchronization."
fi

echo "==> Launching Next.js server on port ${PORT:-3000}..."
exec "$@"
