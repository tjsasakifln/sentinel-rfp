#!/usr/bin/env bash
# Sentinel RFP - Docker Environment Initialization Script
# This script starts all Docker services and ensures they're healthy

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Sentinel RFP - Docker Environment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running${NC}"
  echo "Please start Docker Desktop and try again."
  exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Warning: .env file not found${NC}"
  echo "Copying .env.example to .env..."
  cp .env.example .env
  echo -e "${GREEN}.env file created successfully${NC}"
  echo ""
  echo -e "${YELLOW}Please update .env with your actual credentials before proceeding.${NC}"
  echo "Press Enter to continue or Ctrl+C to exit..."
  read
fi

echo -e "${GREEN}Starting Docker services...${NC}"
echo ""

# Start services in detached mode
docker-compose up -d

echo ""
echo -e "${GREEN}Waiting for services to be healthy...${NC}"
echo ""

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
while ! docker-compose exec -T postgres pg_isready -U sentinel_user -d sentinel_rfp > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e " ${GREEN}✓${NC}"

# Wait for Redis
echo -n "Waiting for Redis..."
while ! docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e " ${GREEN}✓${NC}"

# Wait for Meilisearch
echo -n "Waiting for Meilisearch..."
until curl -s http://localhost:7700/health > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e " ${GREEN}✓${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All services are healthy! ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service URLs:"
echo "  - PostgreSQL:   localhost:5432"
echo "  - Redis:        localhost:6379"
echo "  - Meilisearch:  http://localhost:7700"
echo ""
echo "Useful commands:"
echo "  - View logs:    docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart:      docker-compose restart"
echo ""
echo -e "${GREEN}Ready for development!${NC}"
