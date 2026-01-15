#!/bin/sh
set -e

echo "Running database migrations..."
node_modules/.bin/typeorm migration:run -d dist/data-source.js

echo "Starting application..."
exec node dist/main
