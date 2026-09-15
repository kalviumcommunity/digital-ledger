#!/bin/sh
set -e

echo "===================================================="
echo " Starting Digital Ledger Application in Container   "
echo "===================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "==> Triggering database schema sync in background..."
  (
    prisma db push --schema=prisma/schema.prisma --skip-generate || echo "==> Notice: Schema sync finished or using pooled database."

    if [ "$AUTO_SEED" = "true" ]; then
      echo "==> AUTO_SEED is enabled: seeding demo data..."
      node prisma/seed.js || echo "==> Seeding step finished."
    fi
  ) &
fi

if [ -n "$BREVO_API_KEY" ]; then
  echo "==> [EMAIL CONFIG] BREVO_API_KEY is detected in container."
else
  echo "==> [EMAIL CONFIG] BREVO_API_KEY is not directly set in container env."
fi

if [ -n "$BREVO_SENDER_EMAIL" ] || [ -n "$BREVO_SENDER" ]; then
  echo "==> [EMAIL CONFIG] Brevo sender email is detected in container."
fi

echo "==> Launching Next.js server on port ${PORT:-3000}..."
exec "$@"
