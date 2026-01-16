/**
 * Organization E2E Tests
 *
 * Tests the complete organization CRUD flow:
 * - Create organization (OWNER/ADMIN only)
 * - List organizations (OWNER/ADMIN only)
 * - Get organization details (OWNER/ADMIN only)
 * - Update organization (OWNER/ADMIN only)
 * - Delete organization (OWNER only)
 * - Role-based access control
 *
 * @module OrganizationE2ESpec
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

describe('Organizations (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let ownerOrgId: string;

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
        email: `test+org-owner${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Owner',
        lastName: 'User',
        organizationName: `Test Org Owner ${timestamp}`,
      })
      .expect(201);

    expect(ownerResponse.body).toHaveProperty('data');
    expect(ownerResponse.body.data).toHaveProperty('accessToken');
    expect(ownerResponse.body.data).toHaveProperty('user');
    expect(ownerResponse.body.data.user).toHaveProperty('organizationId');

    ownerToken = ownerResponse.body.data.accessToken;
    ownerOrgId = ownerResponse.body.data.user.organizationId;

    // Create ADMIN via register and update role
    const adminRegisterResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test+org-admin-real${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Admin',
        lastName: 'User',
        organizationName: `Test Org Admin ${timestamp}`,
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
        email: `test+org-admin-real${timestamp}@example.com`,
        password: 'SecurePass123!',
      })
      .expect(200);

    adminToken = adminLoginResponse.body.data.accessToken;

    // Create MEMBER user
    const memberRegisterResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test+org-member${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Member',
        lastName: 'User',
        organizationName: `Test Org Member ${timestamp}`,
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
        email: `test+org-member${timestamp}@example.com`,
        password: 'SecurePass123!',
      })
      .expect(200);

    memberToken = memberLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup: delete test data
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test+org',
        },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        name: {
          startsWith: 'Test Org',
        },
      },
    });

    await app.close();
  });

  describe('/api/v1/organizations (POST)', () => {
    it('should create organization as OWNER', async () => {
      const createDto = {
        name: `Test Org Created ${Date.now()}`,
        settings: { theme: 'dark' },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        name: createDto.name,
        plan: 'PROFESSIONAL', // default
        status: 'ACTIVE',
        settings: createDto.settings,
      });
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should create organization as ADMIN', async () => {
      const createDto = {
        name: `Test Org Admin Created ${Date.now()}`,
      };

      await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201);
    });

    it('should reject creation as MEMBER (403)', async () => {
      const createDto = {
        name: `Test Org Member Attempt ${Date.now()}`,
      };

      await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(createDto)
        .expect(403);
    });

    it('should reject without token (401)', async () => {
      const createDto = {
        name: `Test Org No Token ${Date.now()}`,
      };

      await request(app.getHttpServer()).post('/api/v1/organizations').send(createDto).expect(401);
    });

    it('should auto-generate unique slug', async () => {
      const createDto = {
        name: 'Test Org Slug Generation',
      };

      const response1 = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(createDto)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(createDto)
        .expect(201);

      expect(response1.body.data.slug).not.toBe(response2.body.data.slug);
      expect(response2.body.data.slug).toMatch(/test-org-slug-generation-\d+/);
    });
  });

  describe('/api/v1/organizations (GET)', () => {
    it('should list organizations as OWNER', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const org = response.body.data[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('slug');
      expect(org).toHaveProperty('_count');
      expect(org._count).toHaveProperty('users');
    });

    it('should list organizations as ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject listing as MEMBER (403)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe('/api/v1/organizations/:id (GET)', () => {
    it('should get organization details as OWNER', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', ownerOrgId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should return 404 for non-existent organization', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/organizations/:id (PATCH)', () => {
    it('should update organization as OWNER', async () => {
      const updateDto = {
        name: `Updated Org Name ${Date.now()}`,
        settings: { theme: 'light', notifications: false },
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject(updateDto);
    });

    it('should reject slug modification (409)', async () => {
      const updateDto = {
        slug: 'new-slug-attempt',
      };

      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateDto)
        .expect(409);
    });

    it('should update organization as ADMIN', async () => {
      const updateDto = {
        name: `Admin Updated ${Date.now()}`,
      };

      const adminOrgId = await prisma.organization.findFirst({
        where: {
          users: {
            some: {
              email: { contains: 'test+org-admin-real' },
            },
          },
        },
        select: { id: true },
      });

      if (!adminOrgId) {
        throw new Error('Admin organization not found');
      }

      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${adminOrgId.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);
    });

    it('should reject update as MEMBER (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });
  });

  describe('/api/v1/organizations/:id (DELETE)', () => {
    let orgToDelete: string;

    beforeEach(async () => {
      // Create fresh org for each delete test
      const response = await request(app.getHttpServer())
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Org To Delete ${Date.now()}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      orgToDelete = response.body.data.id;
    });

    it('should soft delete organization as OWNER', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgToDelete}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('deletedAt');
      expect(response.body.data.deletedAt).not.toBeNull();

      // Verify soft delete in database
      const deletedOrg = await prisma.organization.findUnique({
        where: { id: orgToDelete },
      });
      expect(deletedOrg).not.toBeNull();
      expect(deletedOrg!.deletedAt).not.toBeNull();
    });

    it('should reject delete as ADMIN (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should reject delete as MEMBER (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgToDelete}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should return 404 when deleting already deleted organization', async () => {
      // Delete once
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgToDelete}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Try to delete again
      await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${orgToDelete}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
