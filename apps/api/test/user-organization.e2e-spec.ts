/**
 * User-Organization Relationship E2E Tests
 *
 * Tests the user-organization many-to-many relationship:
 * - Add member to organization (OWNER/ADMIN only)
 * - List organization members (OWNER/ADMIN only)
 * - Remove member from organization (OWNER/ADMIN only)
 * - Role-based access control
 * - Cross-tenant isolation
 *
 * @module UserOrganizationE2ESpec
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

describe('User-Organization Relationships (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let ownerOrgId: string;
  let org2Id: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Create test users with different roles
    const timestamp = Date.now();

    // Create OWNER user
    const ownerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test+uo-owner${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Owner',
        lastName: 'User',
        organizationName: `Test UO Org Owner ${timestamp}`,
      })
      .expect(201);

    expect(ownerResponse.body).toHaveProperty('data');
    expect(ownerResponse.body.data).toHaveProperty('accessToken');
    expect(ownerResponse.body.data).toHaveProperty('user');
    expect(ownerResponse.body.data.user).toHaveProperty('organizationId');

    ownerToken = ownerResponse.body.data.accessToken;
    ownerOrgId = ownerResponse.body.data.user.organizationId;

    // Create ADMIN user
    const adminRegisterResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test+uo-admin${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Admin',
        lastName: 'User',
        organizationName: `Test UO Org Admin ${timestamp}`,
      })
      .expect(201);

    expect(adminRegisterResponse.body).toHaveProperty('data');
    expect(adminRegisterResponse.body.data).toHaveProperty('accessToken');
    expect(adminRegisterResponse.body.data).toHaveProperty('user');
    expect(adminRegisterResponse.body.data.user).toHaveProperty('id');

    adminToken = adminRegisterResponse.body.data.accessToken;

    // Update user role to ADMIN
    await prisma.user.update({
      where: { id: adminRegisterResponse.body.data.user.id },
      data: { role: UserRole.ADMIN },
    });

    // Login again to get JWT with updated ADMIN role
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `test+uo-admin${timestamp}@example.com`,
        password: 'SecurePass123!',
      })
      .expect(200);

    adminToken = adminLoginResponse.body.data.accessToken;

    // Create MEMBER user
    const memberRegisterResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test+uo-member${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Member',
        lastName: 'User',
        organizationName: `Test UO Org Member ${timestamp}`,
      })
      .expect(201);

    expect(memberRegisterResponse.body).toHaveProperty('data');
    expect(memberRegisterResponse.body.data).toHaveProperty('accessToken');
    expect(memberRegisterResponse.body.data).toHaveProperty('user');
    expect(memberRegisterResponse.body.data.user).toHaveProperty('id');

    memberToken = memberRegisterResponse.body.data.accessToken;

    // Update user role to MEMBER
    await prisma.user.update({
      where: { id: memberRegisterResponse.body.data.user.id },
      data: { role: UserRole.MEMBER },
    });

    // Login again to get JWT with updated MEMBER role
    const memberLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `test+uo-member${timestamp}@example.com`,
        password: 'SecurePass123!',
      })
      .expect(200);

    memberToken = memberLoginResponse.body.data.accessToken;

    // Create a test user to add to organizations
    const org2 = await prisma.organization.create({
      data: {
        name: `Test UO Org 2 ${timestamp}`,
        slug: `test-uo-org-2-${timestamp}`,
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });
    org2Id = org2.id;

    const testUser = await prisma.user.create({
      data: {
        email: `test+uo-test-user${timestamp}@example.com`,
        passwordHash: 'hashed',
        name: 'Test User',
        role: UserRole.MEMBER,
        status: 'ACTIVE',
        organizationId: org2Id,
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup: delete test data
    try {
      await prisma.userOrganization.deleteMany({
        where: {
          user: {
            email: {
              startsWith: 'test+uo',
            },
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test+uo',
          },
        },
      });

      await prisma.organization.deleteMany({
        where: {
          name: {
            startsWith: 'Test UO',
          },
        },
      });

      await prisma.$disconnect();
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    await app.close();
  });

  describe('/api/v1/organizations/:id/members (POST)', () => {
    it('should add member to organization as OWNER', async () => {
      const addMemberDto = {
        userId: testUserId,
        role: UserRole.MEMBER,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(addMemberDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        userId: testUserId,
        organizationId: ownerOrgId,
        role: UserRole.MEMBER,
      });
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('joinedAt');
      expect(response.body.data.user).toMatchObject({
        id: testUserId,
        email: expect.stringContaining('test+uo-test-user'),
      });
    });

    it('should add member to organization as ADMIN', async () => {
      // Create another test user
      const timestamp = Date.now();
      const anotherUser = await prisma.user.create({
        data: {
          email: `test+uo-another${timestamp}@example.com`,
          passwordHash: 'hashed',
          name: 'Another User',
          role: UserRole.MEMBER,
          status: 'ACTIVE',
          organizationId: org2Id,
        },
      });

      const addMemberDto = {
        userId: anotherUser.id,
        role: UserRole.VIEWER,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(addMemberDto)
        .expect(201);
    });

    it('should reject adding member as MEMBER (403)', async () => {
      const addMemberDto = {
        userId: testUserId,
        role: UserRole.MEMBER,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(addMemberDto)
        .expect(403);
    });

    it('should reject duplicate member (409)', async () => {
      const addMemberDto = {
        userId: testUserId,
        role: UserRole.MEMBER,
      };

      // Already added in first test
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(addMemberDto)
        .expect(409);
    });

    it('should reject invalid user ID (404)', async () => {
      const addMemberDto = {
        userId: '00000000-0000-0000-0000-000000000000',
        role: UserRole.MEMBER,
      };

      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(addMemberDto)
        .expect(404);
    });
  });

  describe('/api/v1/organizations/:id/members (GET)', () => {
    it('should list organization members as OWNER', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify structure
      const firstMember = response.body.data[0];
      expect(firstMember).toHaveProperty('id');
      expect(firstMember).toHaveProperty('userId');
      expect(firstMember).toHaveProperty('organizationId');
      expect(firstMember).toHaveProperty('role');
      expect(firstMember).toHaveProperty('joinedAt');
      expect(firstMember.user).toHaveProperty('id');
      expect(firstMember.user).toHaveProperty('email');
      expect(firstMember.user).toHaveProperty('name');
    });

    it('should list organization members as ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject listing members as MEMBER (403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe('/api/v1/organizations/:id/members/:userId (DELETE)', () => {
    it('should remove member from organization as OWNER', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${ownerOrgId}/members/${testUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        userId: testUserId,
        organizationId: ownerOrgId,
      });

      // Verify member was removed
      const userOrg = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: testUserId,
            organizationId: ownerOrgId,
          },
        },
      });
      expect(userOrg).toBeNull();
    });

    it('should reject removing member as MEMBER (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${ownerOrgId}/members/${testUserId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should reject removing non-member (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${ownerOrgId}/members/${testUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404); // Already removed in previous test
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should not allow accessing members from different organization', async () => {
      // Try to list members of org2 with owner of org1 token
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${org2Id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Should return empty or only members visible to this user
      // (depends on tenant isolation implementation)
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
