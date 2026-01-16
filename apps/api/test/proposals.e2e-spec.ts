/**
 * Proposals E2E Tests
 *
 * Tests the Proposal CRUD endpoints:
 * - POST /api/v1/proposals (Create)
 * - GET /api/v1/proposals (List with pagination)
 * - GET /api/v1/proposals/:id (FindOne)
 * - PUT /api/v1/proposals/:id (Update)
 * - DELETE /api/v1/proposals/:id (Delete) - Issue #148
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

    expect(authResponse.body).toHaveProperty('accessToken');
    expect(authResponse.body).toHaveProperty('user');
    expect(authResponse.body.user).toHaveProperty('organizationId');

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

      expect(auth2Response.body).toHaveProperty('accessToken');
      expect(auth2Response.body).toHaveProperty('user');
      expect(auth2Response.body.user).toHaveProperty('organizationId');

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
      await request(app.getHttpServer()).get('/api/v1/proposals').expect(401);
    });

    it('should only return proposals for authenticated user org (tenant isolation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // All proposals should belong to the authenticated user's org
      response.body.data.forEach((proposal: { organizationId: string }) => {
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
      await request(app.getHttpServer()).get(`/api/v1/proposals/${createdProposalId}`).expect(401);
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

      expect(auth2Response.body).toHaveProperty('accessToken');
      expect(auth2Response.body).toHaveProperty('user');
      expect(auth2Response.body.user).toHaveProperty('id');
      expect(auth2Response.body.user).toHaveProperty('organizationId');

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

  describe('/api/v1/proposals/:id (PUT)', () => {
    let proposalToUpdate: string;

    beforeAll(async () => {
      // Create a proposal to update
      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Original Title',
          rfpNumber: 'ORIGINAL-001',
          status: 'draft',
        })
        .expect(201);

      proposalToUpdate = response.body.id;
    });

    it('should update a proposal with valid data', async () => {
      const updateDto = {
        title: 'Updated Title',
        rfpNumber: 'UPDATED-001',
        status: 'in_progress',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('id', proposalToUpdate);
      expect(response.body).toHaveProperty('title', updateDto.title);
      expect(response.body).toHaveProperty('rfpNumber', updateDto.rfpNumber);
      expect(response.body).toHaveProperty('status', updateDto.status);
      expect(response.body).toHaveProperty('organizationId', organizationId);
      expect(response.body).toHaveProperty('updatedAt');

      // Verify updatedAt was modified
      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(response.body.createdAt).getTime(),
      );
    });

    it('should update only title (partial update)', async () => {
      const updateDto = {
        title: 'Only Title Updated',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('title', updateDto.title);
      expect(response.body).toHaveProperty('rfpNumber'); // Should remain unchanged
    });

    it('should update only status (partial update)', async () => {
      const updateDto = {
        status: 'completed',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('title'); // Should remain unchanged
    });

    it('should fail with 404 when proposal does not exist', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const updateDto = {
        title: 'Should Fail',
      };

      await request(app.getHttpServer())
        .put(`/api/v1/proposals/${fakeUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('should fail with 400 when ID is not a valid UUID', async () => {
      const updateDto = {
        title: 'Should Fail',
      };

      await request(app.getHttpServer())
        .put('/api/v1/proposals/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(400);
    });

    it('should fail with 401 when no auth token provided', async () => {
      const updateDto = {
        title: 'Should Fail',
      };

      await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .send(updateDto)
        .expect(401);
    });

    it('should fail with 400 when title exceeds max length', async () => {
      const updateDto = {
        title: 'A'.repeat(501), // Max is 500
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('500 characters');
    });

    it('should fail with 400 when rfpNumber exceeds max length', async () => {
      const updateDto = {
        rfpNumber: 'A'.repeat(101), // Max is 100
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('100 characters');
    });

    it('should enforce tenant isolation (404 for other org proposals)', async () => {
      // Create second user in different org
      const timestamp2 = Date.now();
      const register2Dto = {
        email: `test+update${timestamp2}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Update',
        lastName: 'Tester',
        organizationName: `Test Update Org ${timestamp2}`,
      };

      const auth2Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(register2Dto)
        .expect(201);

      expect(auth2Response.body).toHaveProperty('accessToken');
      expect(auth2Response.body).toHaveProperty('user');
      expect(auth2Response.body.user).toHaveProperty('id');
      expect(auth2Response.body.user).toHaveProperty('organizationId');

      const accessToken2 = auth2Response.body.accessToken;

      // Try to update first user's proposal with second user's token
      const updateDto = {
        title: 'Should Fail - Wrong Org',
      };

      await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .send(updateDto)
        .expect(404); // Should return 404 (not 403) for security

      // Verify proposal was NOT updated
      const checkResponse = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(checkResponse.body.title).not.toBe('Should Fail - Wrong Org');

      // Cleanup second org
      await prisma.user.deleteMany({
        where: { id: auth2Response.body.user.id },
      });
      await prisma.organization.deleteMany({
        where: { id: auth2Response.body.user.organizationId },
      });
    });

    it('should not allow updating organizationId (security)', async () => {
      const maliciousUpdateDto = {
        organizationId: '00000000-0000-0000-0000-000000000000',
        title: 'Malicious Update',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalToUpdate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(maliciousUpdateDto)
        .expect(200);

      // Verify organizationId was NOT changed
      expect(response.body.organizationId).toBe(organizationId);
      expect(response.body.organizationId).not.toBe('00000000-0000-0000-0000-000000000000');
    });
  });

  describe('/api/v1/proposals/:id (DELETE)', () => {
    let proposalToDelete: string;
    let proposalWithSections: string;

    beforeAll(async () => {
      // Create a proposal to delete
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Proposal to Delete',
          rfpNumber: 'DELETE-001',
          status: 'draft',
        })
        .expect(201);

      proposalToDelete = response1.body.id;

      // Create a proposal with sections for cascade delete test
      const response2 = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Proposal with Sections',
          rfpNumber: 'DELETE-002',
          status: 'draft',
        })
        .expect(201);

      proposalWithSections = response2.body.id;

      // Add sections to the proposal
      await prisma.proposalSection.createMany({
        data: [
          {
            title: 'Section 1',
            order: 1,
            proposalId: proposalWithSections,
          },
          {
            title: 'Section 2',
            order: 2,
            proposalId: proposalWithSections,
          },
        ],
      });
    });

    it('should soft delete a proposal (204 No Content)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposalToDelete}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify proposal is marked as deleted in database
      const deletedProposal = await prisma.proposal.findUnique({
        where: { id: proposalToDelete },
      });

      expect(deletedProposal).not.toBeNull();
      expect(deletedProposal?.deletedAt).not.toBeNull();
      expect(deletedProposal?.deletedAt).toBeInstanceOf(Date);
    });

    it('should cascade soft delete sections when deleting proposal', async () => {
      // Get sections before delete
      const sectionsBefore = await prisma.proposalSection.findMany({
        where: { proposalId: proposalWithSections },
      });

      expect(sectionsBefore.length).toBe(2);

      // Delete proposal
      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposalWithSections}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify proposal is soft deleted
      const deletedProposal = await prisma.proposal.findUnique({
        where: { id: proposalWithSections },
      });

      expect(deletedProposal?.deletedAt).not.toBeNull();

      // Verify sections are also soft deleted (cascade)
      const sectionsAfter = await prisma.proposalSection.findMany({
        where: { proposalId: proposalWithSections },
      });

      expect(sectionsAfter.length).toBe(2);
      sectionsAfter.forEach((section) => {
        expect(section.deletedAt).not.toBeNull();
        expect(section.deletedAt).toBeInstanceOf(Date);
      });
    });

    it('should fail with 404 when proposal does not exist', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${fakeUuid}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with 404 when trying to delete already deleted proposal', async () => {
      // Create and delete a proposal
      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Already Deleted',
          rfpNumber: 'DELETE-TWICE',
        })
        .expect(201);

      const proposalId = response.body.id;

      // First delete - should succeed
      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Second delete - should fail with 404
      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with 400 when ID is not a valid UUID', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/proposals/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail with 401 when no auth token provided', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposalToDelete}`)
        .expect(401);
    });

    it('should enforce tenant isolation (404 for other org proposals)', async () => {
      // Create second user in different org
      const timestamp2 = Date.now();
      const register2Dto = {
        email: `test+delete${timestamp2}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Delete',
        lastName: 'Tester',
        organizationName: `Test Delete Org ${timestamp2}`,
      };

      const auth2Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(register2Dto)
        .expect(201);

      expect(auth2Response.body).toHaveProperty('accessToken');
      expect(auth2Response.body).toHaveProperty('user');
      expect(auth2Response.body.user).toHaveProperty('id');
      expect(auth2Response.body.user).toHaveProperty('organizationId');

      const accessToken2 = auth2Response.body.accessToken;

      // Create proposal for first org
      const proposal1 = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Org 1 Proposal for Delete Test',
          rfpNumber: 'ORG1-DELETE',
        })
        .expect(201);

      // Try to delete first user's proposal with second user's token
      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposal1.body.id}`)
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(404); // Should return 404 (not 403) for security

      // Verify proposal was NOT deleted
      const checkProposal = await prisma.proposal.findUnique({
        where: { id: proposal1.body.id },
      });

      expect(checkProposal).not.toBeNull();
      expect(checkProposal?.deletedAt).toBeNull();

      // Cleanup second org
      await prisma.user.deleteMany({
        where: { id: auth2Response.body.user.id },
      });
      await prisma.organization.deleteMany({
        where: { id: auth2Response.body.user.organizationId },
      });
    });
  });

  describe('/api/v1/proposals (GET) - Filters', () => {
    beforeEach(async () => {
      // Create test proposals with different statuses
      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Draft Proposal for Testing',
          rfpNumber: 'DRAFT-001',
          status: 'draft',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'In Progress Proposal',
          rfpNumber: 'PROGRESS-001',
          status: 'in_progress',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Completed Proposal',
          rfpNumber: 'DONE-001',
          status: 'completed',
        })
        .expect(201);
    });

    it('should filter proposals by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ status: 'draft' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every((p: any) => p.status === 'draft')).toBe(true);
    });

    it('should search proposals by title', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ search: 'Progress' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((p: any) => p.title.includes('Progress'))).toBe(true);
    });

    it('should sort proposals by updatedAt desc', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ sortBy: 'updatedAt', sortOrder: 'desc' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      const dates = response.body.data.map((p: any) => new Date(p.updatedAt).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('/api/v1/dashboard/metrics (GET)', () => {
    beforeEach(async () => {
      // Create proposals with different statuses for metrics
      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Metrics Draft 1',
          status: 'draft',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Metrics In Progress 1',
          status: 'in_progress',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Metrics Completed 1',
          status: 'completed',
        })
        .expect(201);
    });

    it('should return dashboard metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/metrics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalProposals');
      expect(response.body).toHaveProperty('inProgress');
      expect(response.body).toHaveProperty('completed');
      expect(response.body).toHaveProperty('dueSoon');

      expect(typeof response.body.totalProposals).toBe('number');
      expect(typeof response.body.inProgress).toBe('number');
      expect(typeof response.body.completed).toBe('number');
      expect(typeof response.body.dueSoon).toBe('number');

      // Verify metrics are calculated correctly
      expect(response.body.totalProposals).toBeGreaterThanOrEqual(3);
      expect(response.body.inProgress).toBeGreaterThanOrEqual(1);
      expect(response.body.completed).toBeGreaterThanOrEqual(1);
    });

    it('should fail with 401 when no auth token provided', async () => {
      await request(app.getHttpServer()).get('/api/v1/dashboard/metrics').expect(401);
    });

    it('should enforce tenant isolation for metrics', async () => {
      // Create second user in different org
      const timestamp2 = Date.now();
      const register2Dto = {
        email: `test+metrics${timestamp2}@example.com`,
        password: 'SecurePass123!',
        firstName: 'Metrics',
        lastName: 'Tester',
        organizationName: `Test Metrics Org ${timestamp2}`,
      };

      const auth2Response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(register2Dto)
        .expect(201);

      expect(auth2Response.body).toHaveProperty('accessToken');
      expect(auth2Response.body).toHaveProperty('user');
      expect(auth2Response.body.user).toHaveProperty('id');
      expect(auth2Response.body.user).toHaveProperty('organizationId');

      const accessToken2 = auth2Response.body.accessToken;

      // Get metrics for second org (should be 0 proposals)
      const response = await request(app.getHttpServer())
        .get('/api/v1/dashboard/metrics')
        .set('Authorization', `Bearer ${accessToken2}`)
        .expect(200);

      expect(response.body.totalProposals).toBe(0);
      expect(response.body.inProgress).toBe(0);
      expect(response.body.completed).toBe(0);

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
