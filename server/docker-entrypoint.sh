#!/bin/sh
set -e

mkdir -p /app/uploads/property-images /app/uploads/profile-images /app/uploads/lease-agreements

for image in /app/seed-property-images/*; do
  [ -f "$image" ] || continue
  target="/app/uploads/property-images/${image##*/}"
  if [ ! -e "$target" ]; then
    cp "$image" "$target"
  fi
done

npx prisma migrate deploy
exec npm run dev
