#!/usr/bin/env bash
# Sentinel RFP - Generate Prisma Migration Script
# Helper for creating named Prisma migrations with validation

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
Usage: ./scripts/generate-migration.sh [NAME] [OPTIONS]

Generate a new Prisma database migration

ARGUMENTS:
  NAME            Migration name (required)
                  Use snake_case: add_user_roles, update_proposal_schema

OPTIONS:
  -h, --help      Show this help message
  --create-only   Create migration without applying it

DESCRIPTION:
  This script simplifies Prisma migration creation:
  1. Validates Prisma schema syntax
  2. Formats schema file
  3. Generates migration SQL
  4. Applies migration to database (optional)
  5. Updates Prisma Client

EXAMPLES:
  ./scripts/generate-migration.sh add_trust_score
  ./scripts/generate-migration.sh update_user_table
  ./scripts/generate-migration.sh init --create-only

NAMING CONVENTIONS:
  - Use snake_case (underscores)
  - Be descriptive but concise
  - Start with verb: add_, update_, remove_, fix_
  - Examples:
    * add_email_verification
    * update_proposal_status_enum
    * remove_deprecated_columns
    * fix_user_organization_relation

EOF
}

# Parse arguments
MIGRATION_NAME=""
CREATE_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    --create-only)
      CREATE_ONLY=true
      shift
      ;;
    -*)
      echo -e "${RED}Unknown option: $1${NC}"
      show_help
      exit 1
      ;;
    *)
      if [ -z "$MIGRATION_NAME" ]; then
        MIGRATION_NAME=$1
      else
        echo -e "${RED}Error: Multiple migration names provided${NC}"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

# Validate migration name provided
if [ -z "$MIGRATION_NAME" ]; then
  echo -e "${RED}Error: Migration name is required${NC}"
  echo ""
  show_help
  exit 1
fi

# Validate migration name format (snake_case)
if ! [[ $MIGRATION_NAME =~ ^[a-z][a-z0-9_]*$ ]]; then
  echo -e "${RED}Error: Invalid migration name format${NC}"
  echo -e "Migration name must:"
  echo -e "  - Start with a lowercase letter"
  echo -e "  - Use only lowercase letters, numbers, and underscores"
  echo -e "  - Use snake_case (e.g., add_user_roles)"
  echo ""
  echo -e "Provided: ${YELLOW}$MIGRATION_NAME${NC}"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Prisma Migration Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Migration name: ${GREEN}$MIGRATION_NAME${NC}"
echo ""

# Navigate to database package
cd packages/database

# Step 1: Validate Prisma schema
echo -e "${GREEN}[1/5] Validating Prisma schema...${NC}"
if ! pnpm prisma:validate; then
  echo -e "${RED}Schema validation failed!${NC}"
  echo -e "Fix errors in prisma/schema.prisma and try again."
  exit 1
fi
echo -e "${GREEN}Schema is valid!${NC}"
echo ""

# Step 2: Format Prisma schema
echo -e "${GREEN}[2/5] Formatting schema...${NC}"
pnpm prisma:format
echo -e "${GREEN}Schema formatted!${NC}"
echo ""

# Step 3: Generate migration
echo -e "${GREEN}[3/5] Generating migration...${NC}"
if [ "$CREATE_ONLY" = true ]; then
  pnpm prisma migrate dev --name "$MIGRATION_NAME" --create-only
  echo -e "${YELLOW}Migration created but not applied (--create-only)${NC}"
else
  pnpm prisma migrate dev --name "$MIGRATION_NAME"
  echo -e "${GREEN}Migration created and applied!${NC}"
fi
echo ""

# Step 4: Generate Prisma Client
echo -e "${GREEN}[4/5] Updating Prisma Client...${NC}"
pnpm db:generate
echo -e "${GREEN}Prisma Client updated!${NC}"
echo ""

# Step 5: Show migration info
echo -e "${GREEN}[5/5] Migration details:${NC}"
MIGRATION_FILE=$(find prisma/migrations -type d -name "*_$MIGRATION_NAME" | head -1)
if [ -n "$MIGRATION_FILE" ]; then
  echo -e "  Location: ${BLUE}$MIGRATION_FILE${NC}"
  echo -e "  SQL file: ${BLUE}$MIGRATION_FILE/migration.sql${NC}"
else
  echo -e "${YELLOW}  Migration folder not found (check prisma/migrations)${NC}"
fi
echo ""

# Return to root
cd ../..

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  Migration completed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$CREATE_ONLY" = false ]; then
  echo -e "${GREEN}Migration has been applied to database.${NC}"
  echo ""
  echo "Next steps:"
  echo "  - Review SQL: cat $MIGRATION_FILE/migration.sql"
  echo "  - Commit migration: git add packages/database/prisma/migrations"
  echo "  - Deploy: pnpm db:migrate:deploy"
else
  echo -e "${YELLOW}Migration created but NOT applied to database.${NC}"
  echo ""
  echo "Next steps:"
  echo "  - Review SQL: cat $MIGRATION_FILE/migration.sql"
  echo "  - Apply migration: pnpm db:migrate:dev"
fi
echo ""
