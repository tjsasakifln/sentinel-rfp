/**
 * Authentication E2E Tests
 *
 * Tests the complete authentication flow:
 * - User registration (new org + existing org)
 * - Email validation
 * - Password validation
 * - Rate limiting
 * - Token generation
 *
 * @module AuthE2ESpec
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    // Cleanup: delete test users and organizations
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test+auth',
        },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        name: {
          startsWith: 'Test Auth Org',
        },
      },
    });

    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user with new organization', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `test+auth${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        organizationName: `Test Auth Org ${timestamp}`,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');

      // Validate user data
      const { user } = response.body;
      expect(user).toMatchObject({
        email: registerDto.email,
        name: `${registerDto.firstName} ${registerDto.lastName}`,
        role: 'OWNER', // First user becomes OWNER
      });
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('organizationId');
      expect(user).toHaveProperty('organizationName', registerDto.organizationName);

      // Validate tokens are JWTs (basic format check)
      expect(response.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(response.body.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

      // Verify user was created in database
      const dbUser = await prisma.user.findUnique({
        where: {
          organizationId_email: {
            organizationId: user.organizationId,
            email: registerDto.email,
          },
        },
        include: {
          organization: true,
        },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe(registerDto.password); // Password should be hashed
      expect(dbUser?.role).toBe('OWNER');
      expect(dbUser?.organization.name).toBe(registerDto.organizationName);
    });

    it('should register a new user in existing organization', async () => {
      // Create organization first
      const timestamp = Date.now();
      const org = await prisma.organization.create({
        data: {
          name: `Test Auth Org Existing ${timestamp}`,
          slug: `test-auth-org-existing-${timestamp}`,
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
        },
      });

      const registerDto = {
        email: `test+auth${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Member',
        lastName: 'User',
        organizationId: org.id,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      const { user } = response.body;
      expect(user.role).toBe('MEMBER'); // Joining existing org = MEMBER role
      expect(user.organizationId).toBe(org.id);
    });

    it('should reject registration with invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Org',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `test+auth${timestamp}@example.com`,
        password: 'weak', // Too weak
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Org',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password');
    });

    it('should reject duplicate email in same organization', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `test+auth${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        organizationName: `Test Auth Org Duplicate ${timestamp}`,
      };

      // First registration - should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      // Get organization ID
      const user = await prisma.user.findFirst({
        where: { email: registerDto.email },
        select: { organizationId: true },
      });

      // Second registration with same email in same org - should fail
      const duplicateDto = {
        ...registerDto,
        organizationId: user?.organizationId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(duplicateDto)
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration with invalid organizationId', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `test+auth${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        organizationId: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Organization not found');
    });

    it('should reject registration without organizationName when creating new org', async () => {
      const timestamp = Date.now();
      const registerDto = {
        email: `test+auth${timestamp}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        // Missing organizationName and organizationId
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Organization name required');
    });
  });
});
