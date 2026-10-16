#!/bin/sh
set -eu

for db in auth products inventory sales; do
  exists="$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'")"
  if [ "$exists" != "1" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE \"${db}\" OWNER \"${POSTGRES_USER}\""
  fi
done
