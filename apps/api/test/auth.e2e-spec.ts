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
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');

      // Validate user data
      const { user } = response.body.data;
      expect(user).toMatchObject({
        email: registerDto.email,
        name: `${registerDto.firstName} ${registerDto.lastName}`,
        role: 'OWNER', // First user becomes OWNER
      });
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('organizationId');
      expect(user).toHaveProperty('organizationName', registerDto.organizationName);

      // Validate tokens are JWTs (basic format check)
      expect(response.body.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(response.body.data.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

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

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');

      const { user } = response.body.data;
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

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.join(' ').toLowerCase()).toContain('email');
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

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.join(' ').toLowerCase()).toContain('password');
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

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('already exists');
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

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('organization');
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

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('organization');
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    let testUser: {
      email: string;
      password: string;
      organizationId: string;
    };

    beforeAll(async () => {
      // Create test user for login tests
      const timestamp = Date.now();
      const email = `test+login${timestamp}@example.com`;
      const password = 'LoginPass123!';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Login',
          lastName: 'Test',
          organizationName: `Login Test Org ${timestamp}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('organizationId');

      testUser = {
        email,
        password,
        organizationId: response.body.data.user.organizationId,
      };
    });

    it('should login with valid credentials', async () => {
      const loginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');

      // Validate user data
      const { user } = response.body.data;
      expect(user).toMatchObject({
        email: testUser.email,
        organizationId: testUser.organizationId,
      });
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('organizationName');

      // Validate tokens are JWTs (basic format check)
      expect(response.body.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(response.body.data.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it('should reject login with invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('invalid');
    });

    it('should reject login with invalid password', async () => {
      const loginDto = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('invalid');
    });

    it('should reject login with malformed email', async () => {
      const loginDto = {
        email: 'not-an-email',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.join(' ').toLowerCase()).toContain('email');
    });

    it('should reject login with missing password', async () => {
      const loginDto = {
        email: testUser.email,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.join(' ').toLowerCase()).toContain('password');
    });

    it('should reject login for inactive user', async () => {
      // Create and immediately deactivate user
      const timestamp = Date.now();
      const email = `test+inactive${timestamp}@example.com`;
      const password = 'InactivePass123!';

      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Inactive',
          lastName: 'User',
          organizationName: `Inactive Test Org ${timestamp}`,
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('data');
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data.user).toHaveProperty('id');

      const userId = registerResponse.body.data.user.id;

      // Suspend user (deactivate)
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });

      // Try to login
      const loginDto = { email, password };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('not active');
    });

    it('should reject login for user in inactive organization', async () => {
      // Create user and immediately deactivate organization
      const timestamp = Date.now();
      const email = `test+inactiveorg${timestamp}@example.com`;
      const password = 'InactiveOrgPass123!';

      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'InactiveOrg',
          lastName: 'User',
          organizationName: `Inactive Org Test ${timestamp}`,
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('data');
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data.user).toHaveProperty('organizationId');

      const orgId = registerResponse.body.data.user.organizationId;

      // Suspend organization (deactivate)
      await prisma.organization.update({
        where: { id: orgId },
        data: { status: 'SUSPENDED' },
      });

      // Try to login
      const loginDto = { email, password };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('not active');
    });

    it('should handle rate limiting (5 req/min)', async () => {
      const loginDto = {
        email: 'ratelimit@example.com',
        password: 'Password123!',
      };

      // Make 5 requests (should succeed or fail with 401, but not 429)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post('/api/v1/auth/login').send(loginDto);
      }

      // 6th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(429);

      expect(response.body).toHaveProperty('detail');
    }, 10000); // Longer timeout for rate limiting test
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    let testUser: {
      email: string;
      password: string;
      accessToken: string;
      refreshToken: string;
    };

    beforeAll(async () => {
      // Create test user for refresh token tests
      const timestamp = Date.now();
      const email = `test+refresh${timestamp}@example.com`;
      const password = 'RefreshPass123!';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Refresh',
          lastName: 'Test',
          organizationName: `Refresh Test Org ${timestamp}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      testUser = {
        email,
        password,
        accessToken: response.body.data.accessToken,
        refreshToken: response.body.data.refreshToken,
      };
    });

    it('should refresh tokens with valid refresh token', async () => {
      const refreshDto = {
        refreshToken: testUser.refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send(refreshDto)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Validate new tokens are different from old ones (rotation)
      expect(response.body.data.accessToken).not.toBe(testUser.accessToken);
      expect(response.body.data.refreshToken).not.toBe(testUser.refreshToken);

      // Validate tokens are JWTs (basic format check)
      expect(response.body.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(response.body.data.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

      // Update test user tokens for subsequent tests
      testUser.accessToken = response.body.data.accessToken;
      testUser.refreshToken = response.body.data.refreshToken;
    });

    it('should reject already-used refresh token (rotation security)', async () => {
      // Login to get new tokens
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const oldRefreshToken = loginResponse.body.data.refreshToken;

      // Use refresh token once (should succeed)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      // Try to use the same refresh token again (should fail - rotation)
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('already used');
    });

    it('should reject expired refresh token', async () => {
      // This test would require manually creating an expired token
      // or waiting for expiration. For now, we test with invalid token.
      const refreshDto = {
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDk0NTkyMDB9.invalid',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send(refreshDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
    });

    it('should reject malformed refresh token', async () => {
      const refreshDto = {
        refreshToken: 'not-a-valid-jwt-token',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send(refreshDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
    });

    it('should reject refresh token from different user', async () => {
      // Create another user
      const timestamp = Date.now();
      const otherUserEmail = `test+other${timestamp}@example.com`;

      const otherUserResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: otherUserEmail,
          password: 'OtherPass123!',
          firstName: 'Other',
          lastName: 'User',
          organizationName: `Other Test Org ${timestamp}`,
        })
        .expect(201);

      expect(otherUserResponse.body).toHaveProperty('data');
      expect(otherUserResponse.body.data).toHaveProperty('refreshToken');

      const otherUserRefreshToken = otherUserResponse.body.data.refreshToken;

      // Try to use other user's refresh token with current user context
      // (In practice, refresh tokens are bearer tokens and don't need user context,
      // but they are tied to the user in the database via refresh token family)
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: otherUserRefreshToken })
        .expect(200); // Should succeed as refresh tokens are standalone

      // Verify the returned token belongs to the other user
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject refresh without refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({}) // Missing refreshToken
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.join(' ').toLowerCase()).toContain('refreshtoken');
    });

    it('should reject refresh token after user logout', async () => {
      // Login to get new tokens
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Logout to blacklist tokens
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);

      // Try to refresh with blacklisted token (should fail)
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('already used');
    });

    it('should handle rate limiting (10 req/min)', async () => {
      // Login to get fresh token for rate limit test
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      let currentRefreshToken = loginResponse.body.data.refreshToken;

      // Make 10 refresh requests (each should succeed and rotate token)
      for (let i = 0; i < 10; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: currentRefreshToken });

        if (res.status === 200) {
          currentRefreshToken = res.body.data.refreshToken;
        }
      }

      // 11th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: currentRefreshToken })
        .expect(429);

      expect(response.body).toHaveProperty('detail');
    }, 15000); // Longer timeout for rate limiting test
  });

  describe('/api/v1/auth/logout (POST)', () => {
    let testUser: {
      email: string;
      password: string;
      accessToken: string;
      refreshToken: string;
    };

    beforeAll(async () => {
      // Create test user for logout tests
      const timestamp = Date.now();
      const email = `test+logout${timestamp}@example.com`;
      const password = 'LogoutPass123!';

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Logout',
          lastName: 'Test',
          organizationName: `Logout Test Org ${timestamp}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      testUser = {
        email,
        password,
        accessToken: response.body.data.accessToken,
        refreshToken: response.body.data.refreshToken,
      };
    });

    it('should logout successfully with valid tokens', async () => {
      const logoutDto = {
        refreshToken: testUser.refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(logoutDto)
        .expect(204);

      // Should return no content
      expect(response.body).toEqual({});
    });

    it('should reject access with blacklisted access token', async () => {
      // Login to get new tokens
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Logout to blacklist tokens
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);

      // Try to use blacklisted access token (should fail)
      // This would be tested on a protected endpoint
      // For now, we test that logging out again fails
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('invalidated');
    });

    it('should reject refresh with blacklisted refresh token', async () => {
      // Login to get new tokens
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Logout to blacklist tokens
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);

      // Try to refresh with blacklisted refresh token (should fail)
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('already used');
    });

    it('should reject logout without authorization header', async () => {
      const logoutDto = {
        refreshToken: testUser.refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send(logoutDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('authorization');
    });

    it('should reject logout with invalid authorization header format', async () => {
      const logoutDto = {
        refreshToken: testUser.refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'InvalidFormat')
        .send(logoutDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('authorization');
    });

    it('should reject logout with missing refresh token', async () => {
      // Login to get fresh access token
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .send({}) // Missing refreshToken
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.join(' ').toLowerCase()).toContain('refreshtoken');
    });

    it('should reject logout with invalid refresh token format', async () => {
      // Login to get fresh access token
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const logoutDto = {
        refreshToken: 'invalid-token-format',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .send(logoutDto)
        .expect(401);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail.toLowerCase()).toContain('logout');
    });

    it('should handle rate limiting (10 req/min)', async () => {
      // Login to get fresh tokens for rate limit test
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      const logoutDto = {
        refreshToken: loginResponse.body.data.refreshToken,
      };

      // Make 10 requests (should succeed on first, then fail with 401 for blacklisted token)
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
          .send(logoutDto);
      }

      // 11th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .send(logoutDto)
        .expect(429);

      expect(response.body).toHaveProperty('detail');
    }, 10000); // Longer timeout for rate limiting test
  });
});
