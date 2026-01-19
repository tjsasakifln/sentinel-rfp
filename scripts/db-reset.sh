#!/usr/bin/env bash
# Sentinel RFP - Database Reset Script
# Drops, recreates, and seeds the database

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
Usage: ./scripts/db-reset.sh [OPTIONS]

Reset Sentinel RFP database (drop, recreate, seed)

OPTIONS:
  -h, --help      Show this help message
  -f, --force     Skip confirmation prompt
  --no-seed       Skip seed data (empty database)

DESCRIPTION:
  This script performs a complete database reset:
  1. Drops all tables and data
  2. Runs all migrations from scratch
  3. Seeds database with test data (optional)

  ⚠️  WARNING: This will DELETE ALL DATA in the database!

EXAMPLES:
  ./scripts/db-reset.sh          # Interactive (asks for confirmation)
  ./scripts/db-reset.sh --force  # Skip confirmation
  ./scripts/db-reset.sh --no-seed # Reset without seed data

EOF
}

# Parse arguments
FORCE=false
NO_SEED=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -f|--force)
      FORCE=true
      shift
      ;;
    --no-seed)
      NO_SEED=true
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
echo -e "${BLUE}  Sentinel RFP - Database Reset${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Warning prompt unless --force
if [ "$FORCE" = false ]; then
  echo -e "${RED}⚠️  WARNING: This will DELETE ALL DATA in the database!${NC}"
  echo ""
  echo -e "Database: ${YELLOW}sentinel_rfp${NC}"
  echo -e "Host: ${YELLOW}localhost:5432${NC}"
  echo ""
  read -p "Are you sure you want to continue? (yes/no): " -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Database reset cancelled.${NC}"
    exit 0
  fi
fi

echo -e "${GREEN}Starting database reset...${NC}"
echo ""

# Navigate to database package
cd packages/database

# Step 1: Reset database (drops all tables and data)
echo -e "${GREEN}[1/3] Dropping all tables and data...${NC}"
if [ "$NO_SEED" = true ]; then
  # Reset without seed
  pnpm prisma migrate reset --force --skip-seed
else
  # Reset with seed
  pnpm prisma migrate reset --force
fi
echo -e "${GREEN}Database dropped and recreated!${NC}"
echo ""

# Step 2: Run migrations
echo -e "${GREEN}[2/3] Running all migrations...${NC}"
pnpm db:migrate:deploy
echo -e "${GREEN}Migrations completed!${NC}"
echo ""

# Step 3: Generate Prisma Client
echo -e "${GREEN}[3/3] Generating Prisma Client...${NC}"
pnpm db:generate
echo -e "${GREEN}Prisma Client generated!${NC}"
echo ""

# Return to root
cd ../..

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Database reset completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$NO_SEED" = false ]; then
  echo -e "${GREEN}Database has been reset with seed data.${NC}"
else
  echo -e "${YELLOW}Database has been reset (empty, no seed data).${NC}"
fi

echo ""
echo "Next steps:"
echo "  - Start development: pnpm dev"
echo "  - View database: pnpm db:studio"
echo ""
