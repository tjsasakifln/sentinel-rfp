/**
 * Permission Enum
 *
 * Granular permissions following the resource:action format.
 * Used by PermissionsGuard for fine-grained access control.
 *
 * Format: {resource}:{action}
 * Resources: proposal, library, document, user, organization
 * Actions: create, read, update, delete, export, manage
 *
 * @module Permission
 */

/**
 * System-wide permissions enum
 *
 * Permissions are resource-scoped and action-specific.
 * Multiple permissions can be required for a single endpoint.
 *
 * @example
 * ```typescript
 * @Permissions(Permission.PROPOSAL_CREATE, Permission.LIBRARY_READ)
 * @Post('/proposals')
 * createProposal() {}
 * ```
 */
export enum Permission {
  // Proposal Permissions
  PROPOSAL_CREATE = 'proposal:create',
  PROPOSAL_READ = 'proposal:read',
  PROPOSAL_UPDATE = 'proposal:update',
  PROPOSAL_DELETE = 'proposal:delete',
  PROPOSAL_EXPORT = 'proposal:export',
  PROPOSAL_MANAGE = 'proposal:manage', // All proposal actions

  // Library Permissions
  LIBRARY_CREATE = 'library:create',
  LIBRARY_READ = 'library:read',
  LIBRARY_UPDATE = 'library:update',
  LIBRARY_DELETE = 'library:delete',
  LIBRARY_MANAGE = 'library:manage', // All library actions

  // Document Permissions
  DOCUMENT_UPLOAD = 'document:upload',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_MANAGE = 'document:manage', // All document actions

  // User Permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE = 'user:manage', // All user actions

  // Organization Permissions
  ORG_READ = 'organization:read',
  ORG_UPDATE = 'organization:update',
  ORG_DELETE = 'organization:delete',
  ORG_MANAGE = 'organization:manage', // All organization actions

  // Settings & Integrations
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
  INTEGRATION_MANAGE = 'integration:manage',

  // SME-specific
  SME_RESPOND = 'sme:respond', // Respond to requests via Slack/Teams
}

/**
 * Permission to readable description mapping
 *
 * Used for UI display and audit logs
 */
export const PermissionDescriptions: Record<Permission, string> = {
  [Permission.PROPOSAL_CREATE]: 'Create new proposals',
  [Permission.PROPOSAL_READ]: 'View proposals',
  [Permission.PROPOSAL_UPDATE]: 'Edit proposals',
  [Permission.PROPOSAL_DELETE]: 'Delete proposals',
  [Permission.PROPOSAL_EXPORT]: 'Export proposals to Word/PDF',
  [Permission.PROPOSAL_MANAGE]: 'Full proposal management',

  [Permission.LIBRARY_CREATE]: 'Create library entries',
  [Permission.LIBRARY_READ]: 'View library entries',
  [Permission.LIBRARY_UPDATE]: 'Edit library entries',
  [Permission.LIBRARY_DELETE]: 'Delete library entries',
  [Permission.LIBRARY_MANAGE]: 'Full library management',

  [Permission.DOCUMENT_UPLOAD]: 'Upload documents',
  [Permission.DOCUMENT_READ]: 'View documents',
  [Permission.DOCUMENT_DELETE]: 'Delete documents',
  [Permission.DOCUMENT_MANAGE]: 'Full document management',

  [Permission.USER_CREATE]: 'Invite users',
  [Permission.USER_READ]: 'View users',
  [Permission.USER_UPDATE]: 'Edit user details',
  [Permission.USER_DELETE]: 'Remove users',
  [Permission.USER_MANAGE]: 'Full user management',

  [Permission.ORG_READ]: 'View organization details',
  [Permission.ORG_UPDATE]: 'Edit organization settings',
  [Permission.ORG_DELETE]: 'Delete organization',
  [Permission.ORG_MANAGE]: 'Full organization management',

  [Permission.SETTINGS_READ]: 'View settings',
  [Permission.SETTINGS_UPDATE]: 'Edit settings',
  [Permission.INTEGRATION_MANAGE]: 'Manage integrations (Slack, CRM)',

  [Permission.SME_RESPOND]: 'Respond to SME requests',
};
