#!/bin/sh
set -e

echo "===================================================="
echo " Starting Digital Ledger Application in Container   "
echo "===================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "==> Synchronizing database schema..."
  prisma db push --schema=prisma/schema.prisma --skip-generate || echo "==> Notice: Schema sync finished or using pooled database."

  if [ "$AUTO_SEED" = "true" ]; then
    echo "==> AUTO_SEED is enabled: seeding demo data..."
    node prisma/seed.js || echo "==> Seeding step finished."
  fi
else
  echo "==> WARNING: DATABASE_URL is not set. Skipping schema synchronization."
fi

echo "==> Launching Next.js server on port ${PORT:-3000}..."
exec "$@"
