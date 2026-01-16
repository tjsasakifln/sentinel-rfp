-- Add soft delete support to organizations table
-- Issue: #170 - Organization CRUD Endpoints

-- Add deletedAt column to organizations table
ALTER TABLE "organizations" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create index for filtering active organizations
CREATE INDEX "organizations_deletedAt_idx" ON "organizations"("deletedAt");

-- Comment explaining the soft delete pattern
COMMENT ON COLUMN "organizations"."deletedAt" IS 'Soft delete timestamp - NULL means active, non-NULL means deleted';
