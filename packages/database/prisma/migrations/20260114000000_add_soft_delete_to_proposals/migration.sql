-- Add soft delete support to proposals and proposal_sections
-- Issue #148 - PROP-49e: Implementar DELETE /v1/proposals/:id (Delete)

-- Add deletedAt column to proposals table
ALTER TABLE "proposals" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create index on deletedAt for efficient filtering of active proposals
CREATE INDEX "proposals_deletedAt_idx" ON "proposals"("deletedAt");

-- Add deletedAt column to proposal_sections table (cascade soft delete)
ALTER TABLE "proposal_sections" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create index on deletedAt for proposal_sections
CREATE INDEX "proposal_sections_deletedAt_idx" ON "proposal_sections"("deletedAt");
