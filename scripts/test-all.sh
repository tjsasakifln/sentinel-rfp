#!/usr/bin/env bash
# Sentinel RFP - Test Runner Script
# Runs all tests (unit, integration, e2e) with coverage

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
Usage: ./scripts/test-all.sh [OPTIONS]

Run all tests across the monorepo

OPTIONS:
  -h, --help      Show this help message
  -u, --unit      Run unit tests only
  -i, --integration Run integration tests only
  -e, --e2e       Run E2E tests only
  -c, --coverage  Generate coverage report
  -w, --watch     Run in watch mode
  --no-cache      Clear test cache before running

DESCRIPTION:
  This script runs tests across all packages:
  - Backend: Jest (unit + integration + E2E)
  - Frontend: Vitest (unit + integration)
  - Packages: Package-specific tests

  Default behavior: Run all tests without coverage

TEST TYPES:
  Unit         Fast, isolated tests (mocked dependencies)
  Integration  Tests with real dependencies (DB, Redis)
  E2E          Full application tests (API + UI)

EXAMPLES:
  ./scripts/test-all.sh              # Run all tests
  ./scripts/test-all.sh --coverage   # Run with coverage
  ./scripts/test-all.sh --unit       # Unit tests only
  ./scripts/test-all.sh --e2e        # E2E tests only
  ./scripts/test-all.sh --watch      # Watch mode

COVERAGE:
  Coverage reports are saved to:
  - Backend: apps/backend/coverage/
  - Frontend: apps/frontend/coverage/
  - Combined: coverage/ (lcov format)

EOF
}

# Parse arguments
UNIT_ONLY=false
INTEGRATION_ONLY=false
E2E_ONLY=false
COVERAGE=false
WATCH=false
NO_CACHE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -u|--unit)
      UNIT_ONLY=true
      shift
      ;;
    -i|--integration)
      INTEGRATION_ONLY=true
      shift
      ;;
    -e|--e2e)
      E2E_ONLY=true
      shift
      ;;
    -c|--coverage)
      COVERAGE=true
      shift
      ;;
    -w|--watch)
      WATCH=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
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
echo -e "${BLUE}  Sentinel RFP - Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Build test command
TEST_CMD="pnpm turbo run test"

if [ "$UNIT_ONLY" = true ]; then
  echo -e "${GREEN}Mode: Unit tests only${NC}"
  TEST_CMD="$TEST_CMD --filter='!*e2e*' --filter='!*integration*'"
elif [ "$INTEGRATION_ONLY" = true ]; then
  echo -e "${GREEN}Mode: Integration tests only${NC}"
  TEST_CMD="pnpm turbo run test:integration"
elif [ "$E2E_ONLY" = true ]; then
  echo -e "${GREEN}Mode: E2E tests only${NC}"
  TEST_CMD="pnpm turbo run test:e2e"
else
  echo -e "${GREEN}Mode: All tests (unit + integration + E2E)${NC}"
fi

if [ "$COVERAGE" = true ]; then
  echo -e "${GREEN}Coverage: Enabled${NC}"
  TEST_CMD="$TEST_CMD --coverage"
fi

if [ "$WATCH" = true ]; then
  echo -e "${GREEN}Watch mode: Enabled${NC}"
  TEST_CMD="$TEST_CMD --watch"
fi

echo ""

# Clear cache if requested
if [ "$NO_CACHE" = true ]; then
  echo -e "${YELLOW}Clearing test cache...${NC}"
  pnpm turbo run test --force
  echo -e "${GREEN}Cache cleared!${NC}"
  echo ""
fi

# Ensure Docker services are running (for integration/E2E tests)
if [ "$UNIT_ONLY" = false ]; then
  echo -e "${YELLOW}Checking Docker services...${NC}"

  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Integration and E2E tests require Docker services."
    echo "Please start Docker and run: pnpm docker:up"
    exit 1
  fi

  # Check if containers are running
  POSTGRES_RUNNING=$(docker-compose ps -q postgres 2>/dev/null)
  if [ -z "$POSTGRES_RUNNING" ]; then
    echo -e "${YELLOW}Starting Docker services...${NC}"
    pnpm docker:up
    echo ""
  else
    echo -e "${GREEN}Docker services already running ✓${NC}"
  fi
  echo ""
fi

# Run tests
echo -e "${GREEN}Running tests...${NC}"
echo ""
echo -e "${BLUE}Command: $TEST_CMD${NC}"
echo ""

# Execute tests
if eval $TEST_CMD; then
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${GREEN}  All tests passed! ✓${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  if [ "$COVERAGE" = true ]; then
    echo -e "${GREEN}Coverage reports generated:${NC}"
    echo "  - Backend: apps/backend/coverage/lcov-report/index.html"
    echo "  - Frontend: apps/frontend/coverage/index.html"
    echo ""
    echo "Open in browser to view detailed coverage."
  fi

  echo ""
  echo "Next steps:"
  echo "  - Commit changes: git commit"
  echo "  - Push to remote: git push"

  exit 0
else
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${RED}  Some tests failed ✗${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  echo -e "${RED}Test failures detected.${NC}"
  echo ""
  echo "Debug steps:"
  echo "  1. Review test output above"
  echo "  2. Run specific test: pnpm test <test-file>"
  echo "  3. Run in watch mode: ./scripts/test-all.sh --watch"
  echo "  4. Check logs: pnpm docker:logs"
  echo ""

  exit 1
fi
