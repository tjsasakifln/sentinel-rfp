/**
 * RBAC Usage Examples
 *
 * This file demonstrates how to use the RBAC system in controllers.
 * NOT imported into the application - for documentation purposes only.
 *
 * @module RBACExamples
 */

import { Controller, Delete, Get, Injectable, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantGuard } from '../tenant/tenant.guard';

import { AnyPermissionsGuard, RequireAnyPermission } from './any-permissions.guard';
import { Permission } from './permissions.enum';
import { PermissionsGuard, Permissions } from './permissions.guard';
import { hasPermission } from './role-permissions.map';

/**
 * Example 1: Role-based protection
 *
 * Simple role checks for admin-only routes.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AdminControllerExample {
  // Only OWNER and ADMIN can access
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('/users')
  listUsers() {
    return { message: 'Admin or Owner only' };
  }

  // Only OWNER can delete organization
  @Roles(UserRole.OWNER)
  @Delete('/organization')
  deleteOrganization() {
    return { message: 'Owner only' };
  }
}

/**
 * Example 2: Permission-based protection
 *
 * Granular permission checks for specific actions.
 */
@Controller('proposals')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProposalControllerExample {
  // Requires PROPOSAL_CREATE permission
  // OWNER, ADMIN, MEMBER have this permission
  @Permissions(Permission.PROPOSAL_CREATE)
  @Post()
  create() {
    return { message: 'User can create proposals' };
  }

  // Requires PROPOSAL_DELETE permission
  // Only OWNER and ADMIN have this permission
  @Permissions(Permission.PROPOSAL_DELETE)
  @Delete(':id')
  delete() {
    return { message: 'User can delete proposals' };
  }

  // Requires BOTH permissions
  @Permissions(Permission.PROPOSAL_UPDATE, Permission.LIBRARY_READ)
  @Put(':id')
  updateWithLibrary() {
    return { message: 'User can update proposals and read library' };
  }
}

/**
 * Example 3: Any permission (OR logic)
 *
 * User needs at least ONE of the specified permissions.
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard, AnyPermissionsGuard)
export class DashboardControllerExample {
  // Allow if user can EITHER create proposals OR manage users
  // ADMIN can do both, MEMBER can create proposals
  @RequireAnyPermission(Permission.PROPOSAL_CREATE, Permission.USER_MANAGE)
  @Get()
  getDashboard() {
    return { message: 'User has proposal or user management access' };
  }
}

/**
 * Example 4: Mixed guards
 *
 * Using multiple guard types in the same controller.
 */
@Controller('library')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LibraryControllerExample {
  // Public within organization (any authenticated user)
  @Get()
  list() {
    return { message: 'All authenticated users can view' };
  }

  // Role-based protection
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @Post()
  create() {
    return { message: 'OWNER, ADMIN, or MEMBER can create' };
  }

  // Permission-based protection
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.LIBRARY_DELETE)
  @Delete(':id')
  delete() {
    return { message: 'User has library delete permission' };
  }
}

/**
 * Example 5: SME-specific routes
 *
 * Routes accessible by Subject Matter Experts.
 */
@Controller('sme')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class SMEControllerExample {
  // Only SME role can respond
  @Roles(UserRole.SME)
  @Post('/respond')
  respond() {
    return { message: 'SME can respond to requests' };
  }

  // SME and ADMIN can view requests
  @Roles(UserRole.SME, UserRole.ADMIN)
  @Get('/requests')
  listRequests() {
    return { message: 'SME or ADMIN can view requests' };
  }
}

/**
 * Example 6: Field-level permission checks (in service)
 *
 * Use hasPermission utility in services for dynamic checks.
 */

@Injectable()
export class ProposalServiceExample {
  async getProposal(id: string, userRole: UserRole) {
    const proposal = await this.findProposal(id);

    // Hide sensitive pricing if user doesn't have permission
    if (!hasPermission(userRole, Permission.PROPOSAL_EXPORT)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pricing, costBreakdown, ...safeProposal } = proposal;
      return safeProposal;
    }

    return proposal;
  }

  private async findProposal(id: string) {
    // Mock proposal
    return {
      id,
      title: 'Sample Proposal',
      pricing: 1000000,
      costBreakdown: { labor: 800000, materials: 200000 },
    };
  }
}
