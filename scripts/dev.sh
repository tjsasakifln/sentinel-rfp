#!/usr/bin/env bash
# Sentinel RFP - Development Environment Startup Script
# Starts all services (Docker + backend + frontend) in one command

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display help message
show_help() {
  cat << EOF
Usage: ./scripts/dev.sh [OPTIONS]

Start Sentinel RFP development environment

OPTIONS:
  -h, --help        Show this help message
  -s, --skip-docker Skip Docker startup (use if already running)
  -d, --docker-only Only start Docker services (no apps)
  --no-migrate      Skip database migrations

DESCRIPTION:
  This script automates the full development environment startup:
  1. Starts Docker services (PostgreSQL, Redis, Meilisearch)
  2. Waits for services to be healthy
  3. Runs database migrations
  4. Starts backend and frontend in parallel

EXAMPLES:
  ./scripts/dev.sh               # Full startup
  ./scripts/dev.sh --skip-docker # Skip Docker (already running)
  ./scripts/dev.sh --docker-only # Only Docker services
  ./scripts/dev.sh --no-migrate  # Skip migrations

EOF
}

# Parse arguments
SKIP_DOCKER=false
DOCKER_ONLY=false
NO_MIGRATE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -s|--skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
    -d|--docker-only)
      DOCKER_ONLY=true
      shift
      ;;
    --no-migrate)
      NO_MIGRATE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Sentinel RFP - Dev Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Start Docker services
if [ "$SKIP_DOCKER" = false ]; then
  echo -e "${GREEN}[1/4] Starting Docker services...${NC}"
  bash scripts/docker-up.sh
  echo ""
else
  echo -e "${YELLOW}[1/4] Skipping Docker startup${NC}"
  echo ""
fi

if [ "$DOCKER_ONLY" = true ]; then
  echo -e "${GREEN}Docker services started successfully!${NC}"
  exit 0
fi

# Step 2: Run database migrations
if [ "$NO_MIGRATE" = false ]; then
  echo -e "${GREEN}[2/4] Running database migrations...${NC}"
  cd packages/database
  pnpm db:migrate:dev --name auto_migration
  cd ../..
  echo -e "${GREEN}Migrations completed!${NC}"
  echo ""
else
  echo -e "${YELLOW}[2/4] Skipping database migrations${NC}"
  echo ""
fi

# Step 3: Generate Prisma Client
echo -e "${GREEN}[3/4] Generating Prisma Client...${NC}"
cd packages/database
pnpm db:generate
cd ../..
echo -e "${GREEN}Prisma Client generated!${NC}"
echo ""

# Step 4: Start applications
echo -e "${GREEN}[4/4] Starting applications...${NC}"
echo ""
echo -e "${BLUE}Starting backend and frontend in parallel...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Start apps with Turbo (runs backend + frontend in parallel)
pnpm dev
