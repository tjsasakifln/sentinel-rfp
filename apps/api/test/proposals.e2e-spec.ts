/**
 * Proposals E2E Tests
 *
 * Tests the Proposal CRUD endpoints:
 * - POST /api/v1/proposals (Create)
 * - Tenant isolation
 * - JWT authentication
 * - Input validation
 *
 * @module ProposalsE2ESpec
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

describe('Proposals (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let organizationId: string;
  let createdProposalId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Create a test user and get auth token
    const timestamp = Date.now();
    const registerDto = {
      email: `test+proposals${timestamp}@example.com`,
      password: 'SecurePass123!',
      firstName: 'Proposal',
      lastName: 'Tester',
      organizationName: `Test Proposals Org ${timestamp}`,
    };

    const authResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registerDto)
      .expect(201);

    accessToken = authResponse.body.accessToken;
    organizationId = authResponse.body.user.organizationId;
  });

  afterAll(async () => {
    // Cleanup: delete test proposals, users and organizations
    await prisma.proposal.deleteMany({
      where: {
        organizationId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test+proposals',
        },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        name: {
          startsWith: 'Test Proposals Org',
        },
      },
    });

    await app.close();
  });

  describe('/api/v1/proposals (POST)', () => {
    it('should create a new proposal with valid data', async () => {
      const createProposalDto = {
        title: 'Test RFP Proposal',
        rfpNumber: 'RFP-2026-001',
        status: 'draft',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createProposalDto)
        .expect(201);

      // Validate response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', createProposalDto.title);
      expect(response.body).toHaveProperty('rfpNumber', createProposalDto.rfpNumber);
      expect(response.body).toHaveProperty('status', 'draft');
      expect(response.body).toHaveProperty('organizationId', organizationId);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Validate UUID format
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should create proposal with default status "draft" when not provided', async () => {
      const createProposalDto = {
        title: 'Minimal Proposal',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createProposalDto)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'draft');
      expect(response.body).toHaveProperty('title', createProposalDto.title);
    });

    it('should create proposal without optional rfpNumber', async () => {
      const createProposalDto = {
        title: 'Proposal Without RFP Number',
        status: 'draft',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createProposalDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', createProposalDto.title);
      expect(response.body.rfpNumber).toBeNull();
    });

    it('should fail with 401 when no auth token provided', async () => {
      const createProposalDto = {
        title: 'Unauthorized Proposal',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .send(createProposalDto)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail with 400 when title is missing', async () => {
      const createProposalDto = {
        rfpNumber: 'RFP-2026-999',
        // title is required
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createProposalDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Title');
    });

    it('should fail with 400 when title exceeds max length', async () => {
      const createProposalDto = {
        title: 'A'.repeat(501), // Max is 500
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createProposalDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('500 characters');
    });

    it('should fail with 400 when rfpNumber exceeds max length', async () => {
      const createProposalDto = {
        title: 'Valid Title',
        rfpNumber: 'A'.repeat(101), // Max is 100
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createProposalDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('100 characters');
    });

    it('should enforce tenant isolation', async () => {
      // Create proposal with first user's token
      const proposal1Dto = {
        title: 'Org 1 Proposal',
        rfpNumber: 'ORG1-001',
      };

      const response1 = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(proposal1Dto)
        .expect(201);

      // Verify organizationId matches authenticated user's org
      expect(response1.body.organizationId).toBe(organizationId);

      // Create second user in different org
      const timestamp2 = Date.now();
      const register2Dto = {
        email: `test+proposals2${timestamp2}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Proposal2',
        lastName: 'Tester2',
        organizationName: `Test Proposals Org 2 ${timestamp2}`,
      };

      const auth2Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(register2Dto)
        .expect(201);

      const accessToken2 = auth2Response.body.accessToken;
      const organizationId2 = auth2Response.body.user.organizationId;

      // Create proposal with second user's token
      const proposal2Dto = {
        title: 'Org 2 Proposal',
        rfpNumber: 'ORG2-001',
      };

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(proposal2Dto)
        .expect(201);

      // Verify tenant isolation: each proposal belongs to its own org
      expect(response2.body.organizationId).toBe(organizationId2);
      expect(response2.body.organizationId).not.toBe(organizationId);

      // Cleanup second org
      await prisma.proposal.deleteMany({
        where: { organizationId: organizationId2 },
      });
      await prisma.user.deleteMany({
        where: { id: auth2Response.body.user.id },
      });
      await prisma.organization.deleteMany({
        where: { id: organizationId2 },
      });
    });
  });

  describe('/api/v1/proposals (GET)', () => {
    beforeAll(async () => {
      // Create test proposals for listing
      const proposal1 = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'List Test Proposal 1', rfpNumber: 'LIST-001' })
        .expect(201);

      createdProposalId = proposal1.body.id;

      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'List Test Proposal 2', rfpNumber: 'LIST-002' })
        .expect(201);
    });

    it('should return paginated list of proposals', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Validate meta pagination
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 20);
      expect(response.body.meta).toHaveProperty('totalPages');

      // Verify we have at least 2 proposals
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      // Validate proposal structure
      const proposal = response.body.data[0];
      expect(proposal).toHaveProperty('id');
      expect(proposal).toHaveProperty('title');
      expect(proposal).toHaveProperty('status');
      expect(proposal).toHaveProperty('organizationId', organizationId);
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(1);
    });

    it('should return empty data for page beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals?page=999&limit=20')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(0);
      expect(response.body.meta.page).toBe(999);
    });

    it('should fail with 401 when no auth token provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .expect(401);
    });

    it('should only return proposals for authenticated user org (tenant isolation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // All proposals should belong to the authenticated user's org
      response.body.data.forEach((proposal: any) => {
        expect(proposal.organizationId).toBe(organizationId);
      });
    });
  });

  describe('/api/v1/proposals/:id (GET)', () => {
    it('should return a proposal by ID with nested sections', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${createdProposalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Validate proposal structure
      expect(response.body).toHaveProperty('id', createdProposalId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('organizationId', organizationId);
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    it('should fail with 404 when proposal does not exist', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/v1/proposals/${fakeUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with 400 when ID is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/proposals/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail with 401 when no auth token provided', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/proposals/${createdProposalId}`)
        .expect(401);
    });

    it('should enforce tenant isolation (404 for other org proposals)', async () => {
      // Create second user in different org
      const timestamp2 = Date.now();
      const register2Dto = {
        email: `test+get${timestamp2}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Get',
        lastName: 'Tester',
        organizationName: `Test Get Org ${timestamp2}`,
      };

      const auth2Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(register2Dto)
        .expect(201);

      const accessToken2 = auth2Response.body.accessToken;

      // Try to access first user's proposal with second user's token
      await request(app.getHttpServer())
        .get(`/api/v1/proposals/${createdProposalId}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(404); // Should return 404 (not 403) for security

      // Cleanup second org
      await prisma.user.deleteMany({
        where: { id: auth2Response.body.user.id },
      });
      await prisma.organization.deleteMany({
        where: { id: auth2Response.body.user.organizationId },
      });
    });
  });
});
