#!/bin/sh
set -e

echo "🚀 ReleaseSignal starting..."
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Running database migrations..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma 2>/dev/null || \
    echo "⚠️  Migrations skipped (demo mode or DB not ready)"
fi

echo "✅ Starting application on port ${PORT:-3000}"
exec node server.js
