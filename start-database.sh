#!/usr/bin/env bash
# Use this script to start a docker container for a local development database

# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/en-us/windows/wsl/install
# 2. Install Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-database.sh`

# On Linux and macOS you can run this script directly - `./start-database.sh`

set -euo pipefail

DB_CONTAINER_NAME="grantmatch-ai-postgres"
# Pinned so every machine gets the same server. Override with POSTGRES_IMAGE=... to test upgrades.
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:17-alpine}"

if ! [ -x "$(command -v docker)" ]; then
  echo "Docker is not installed. Please install docker and try again."
  echo "Docker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but not running. Start Docker Desktop and try again."
  exit 1
fi

if [ ! -f .env ]; then
  echo "No .env file found. Copy .env.example to .env and try again."
  exit 1
fi

# import env variables from .env
set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set in .env"
  exit 1
fi

# Strip the scheme, then split credentials from the host segment on the LAST '@'
# so passwords containing '@' still parse correctly.
DB_URL_BODY="${DATABASE_URL#*://}"
DB_CREDENTIALS="${DB_URL_BODY%@*}"
DB_HOST_SEGMENT="${DB_URL_BODY##*@}"

DB_USER="${DB_CREDENTIALS%%:*}"
DB_PASSWORD="${DB_CREDENTIALS#*:}"
DB_PORT="${DB_HOST_SEGMENT##*:}"
DB_PORT="${DB_PORT%%/*}"
DB_NAME="${DB_HOST_SEGMENT##*/}"
DB_NAME="${DB_NAME%%\?*}"

# Fall back when DATABASE_URL omits an explicit port.
if [ -z "$DB_PORT" ] || [ "$DB_PORT" = "$DB_HOST_SEGMENT" ]; then
  DB_PORT="5432"
fi

# Reuse the container if it already exists, whether or not it is currently running.
if [ -n "$(docker ps -aq -f name="^${DB_CONTAINER_NAME}$")" ]; then
  docker start "$DB_CONTAINER_NAME" >/dev/null
  echo "Database container started on port $DB_PORT"
  exit 0
fi

if [ "$DB_PASSWORD" = "password" ]; then
  echo "You are using the default database password"
  read -p "Should we generate a random password for you? [y/N]: " -r REPLY
  if ! [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set a password in the .env file and try again"
    exit 1
  fi
  # Generate a random URL-safe password
  DB_PASSWORD=$(openssl rand -base64 12 | tr '+/' '-_')
  # Write via a temp file so this behaves the same on BSD (macOS) and GNU sed.
  sed "s#:password@#:$DB_PASSWORD@#" .env > .env.tmp && mv .env.tmp .env
fi

# A port collision here is the most common failure, and docker's own error
# ("port is already allocated") does not say which container is to blame.
PORT_HOLDER=$(docker ps --filter "publish=$DB_PORT" --format '{{.Names}}' | head -1)
if [ -n "$PORT_HOLDER" ]; then
  echo "Port $DB_PORT is already used by the container '$PORT_HOLDER'."
  echo "Either stop it, or point DATABASE_URL in .env at a free port and re-run."
  exit 1
fi

docker run \
  --name "$DB_CONTAINER_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB="$DB_NAME" \
  -d \
  -p "$DB_PORT:5432" \
  "$POSTGRES_IMAGE" >/dev/null

# Block until postgres accepts connections so `pnpm prisma migrate dev` can run
# immediately after this script instead of racing container startup.
echo -n "Waiting for postgres to accept connections"
for _ in $(seq 1 30); do
  if docker exec "$DB_CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo " ready"
    echo "DB_CONTAINER_NAME=$DB_CONTAINER_NAME"
    echo "DB_USER=$DB_USER"
    echo "DB_NAME=$DB_NAME"
    echo "DB_PORT=$DB_PORT"
    echo "Database container was successfully created"
    echo "Next: pnpm prisma migrate dev"
    exit 0
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "Postgres did not become ready in time. Check logs with:"
echo "  docker logs $DB_CONTAINER_NAME"
exit 1
