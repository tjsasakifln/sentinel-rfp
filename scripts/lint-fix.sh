#!/usr/bin/env bash
# Sentinel RFP - Lint & Format Auto-Fix Script
# Runs ESLint and Prettier across entire codebase

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
Usage: ./scripts/lint-fix.sh [OPTIONS]

Auto-fix linting and formatting issues

OPTIONS:
  -h, --help      Show this help message
  -c, --check     Check only (no auto-fix)
  --lint-only     Run ESLint only (skip Prettier)
  --format-only   Run Prettier only (skip ESLint)

DESCRIPTION:
  This script runs code quality tools:
  1. ESLint: Lints TypeScript/JavaScript files and auto-fixes issues
  2. Prettier: Formats all supported files (TS, JSON, MD, etc.)

  Default behavior: Run both ESLint and Prettier with auto-fix

EXAMPLES:
  ./scripts/lint-fix.sh              # Auto-fix everything
  ./scripts/lint-fix.sh --check      # Check without fixing
  ./scripts/lint-fix.sh --lint-only  # Only ESLint
  ./scripts/lint-fix.sh --format-only # Only Prettier

EOF
}

# Parse arguments
CHECK_ONLY=false
LINT_ONLY=false
FORMAT_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -c|--check)
      CHECK_ONLY=true
      shift
      ;;
    --lint-only)
      LINT_ONLY=true
      shift
      ;;
    --format-only)
      FORMAT_ONLY=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

# Validate conflicting options
if [ "$LINT_ONLY" = true ] && [ "$FORMAT_ONLY" = true ]; then
  echo -e "${RED}Error: Cannot use --lint-only and --format-only together${NC}"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Sentinel RFP - Lint & Format${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$CHECK_ONLY" = true ]; then
  echo -e "${YELLOW}Mode: Check only (no auto-fix)${NC}"
else
  echo -e "${GREEN}Mode: Auto-fix enabled${NC}"
fi
echo ""

# Track exit status
ESLINT_FAILED=false
PRETTIER_FAILED=false

# Step 1: ESLint
if [ "$FORMAT_ONLY" = false ]; then
  echo -e "${GREEN}[1/2] Running ESLint...${NC}"

  if [ "$CHECK_ONLY" = true ]; then
    # Check mode: report errors but don't fix
    if pnpm turbo run lint; then
      echo -e "${GREEN}✓ ESLint check passed!${NC}"
    else
      echo -e "${RED}✗ ESLint found issues${NC}"
      ESLINT_FAILED=true
    fi
  else
    # Fix mode: auto-fix issues
    if pnpm eslint . --ext .ts,.tsx --fix; then
      echo -e "${GREEN}✓ ESLint auto-fix completed!${NC}"
    else
      echo -e "${YELLOW}⚠ ESLint found issues that couldn't be auto-fixed${NC}"
      ESLINT_FAILED=true
    fi
  fi
  echo ""
fi

# Step 2: Prettier
if [ "$LINT_ONLY" = false ]; then
  echo -e "${GREEN}[2/2] Running Prettier...${NC}"

  if [ "$CHECK_ONLY" = true ]; then
    # Check mode: report formatting issues
    if pnpm format:check; then
      echo -e "${GREEN}✓ Prettier check passed!${NC}"
    else
      echo -e "${RED}✗ Prettier found formatting issues${NC}"
      PRETTIER_FAILED=true
    fi
  else
    # Fix mode: auto-format files
    if pnpm format; then
      echo -e "${GREEN}✓ Prettier auto-format completed!${NC}"
    else
      echo -e "${RED}✗ Prettier failed${NC}"
      PRETTIER_FAILED=true
    fi
  fi
  echo ""
fi

# Final summary
echo -e "${BLUE}========================================${NC}"

if [ "$ESLINT_FAILED" = false ] && [ "$PRETTIER_FAILED" = false ]; then
  echo -e "${GREEN}  All checks passed! ✓${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  if [ "$CHECK_ONLY" = false ]; then
    echo -e "${GREEN}Code has been linted and formatted successfully.${NC}"
    echo ""
    echo "Next steps:"
    echo "  - Review changes: git diff"
    echo "  - Stage changes: git add ."
    echo "  - Commit: git commit"
  else
    echo -e "${GREEN}No issues found.${NC}"
  fi

  exit 0
else
  echo -e "${RED}  Some checks failed ✗${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  if [ "$ESLINT_FAILED" = true ]; then
    echo -e "${RED}✗ ESLint issues detected${NC}"
    if [ "$CHECK_ONLY" = true ]; then
      echo -e "  Run without --check to auto-fix"
    else
      echo -e "  Some issues require manual fixes"
    fi
  fi

  if [ "$PRETTIER_FAILED" = true ]; then
    echo -e "${RED}✗ Prettier issues detected${NC}"
    if [ "$CHECK_ONLY" = true ]; then
      echo -e "  Run without --check to auto-format"
    fi
  fi

  echo ""
  echo "Review the errors above and fix manually if needed."

  exit 1
fi
