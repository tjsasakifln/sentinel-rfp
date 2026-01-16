/**
 * Tenant Isolation E2E Tests
 *
 * Comprehensive tests validating cross-tenant data isolation.
 * Ensures that data from one organization never leaks to another.
 *
 * Security-critical tests:
 * - Read isolation (GET requests)
 * - Write isolation (POST, PUT, DELETE)
 * - Automatic organization_id injection
 * - Tenant context validation
 * - Performance with organization_id index
 *
 * @module TenantIsolationE2ESpec
 * @see Issue #172
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const prisma = new PrismaClient();

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;

  // Organization 1 (Tenant 1)
  let org1Token: string;
  let org1Id: string;
  let org1ProposalId: string;

  // Organization 2 (Tenant 2)
  let org2Token: string;
  let org2Id: string;
  let org2ProposalId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    // Configure same validation as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Configure exception filters
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    // ===== Setup Organization 1 =====
    const timestamp1 = Date.now();
    const org1Register = {
      email: `test+tenant1_${timestamp1}@example.com`,
      password: 'SecurePass123!',
      firstName: 'Tenant1',
      lastName: 'User',
      organizationName: `Test Tenant1 Org ${timestamp1}`,
    };

    const auth1Response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(org1Register)
      .expect(201);

    expect(auth1Response.body).toHaveProperty('data');
    expect(auth1Response.body.data).toHaveProperty('accessToken');
    expect(auth1Response.body.data).toHaveProperty('user');

    org1Token = auth1Response.body.data.accessToken;
    org1Id = auth1Response.body.data.user.organizationId;

    // Create a proposal for Org 1
    const proposal1Response = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Authorization', `Bearer ${org1Token}`)
      .send({
        title: 'Org 1 Secret Proposal',
        rfpNumber: 'ORG1-SECRET-001',
        status: 'draft',
      })
      .expect(201);

    org1ProposalId = proposal1Response.body.data.id;

    // ===== Setup Organization 2 =====
    const timestamp2 = Date.now() + 1;
    const org2Register = {
      email: `test+tenant2_${timestamp2}@example.com`,
      password: 'SecurePass123!',
      firstName: 'Tenant2',
      lastName: 'User',
      organizationName: `Test Tenant2 Org ${timestamp2}`,
    };

    const auth2Response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(org2Register)
      .expect(201);

    expect(auth2Response.body).toHaveProperty('data');
    expect(auth2Response.body.data).toHaveProperty('accessToken');
    expect(auth2Response.body.data).toHaveProperty('user');

    org2Token = auth2Response.body.data.accessToken;
    org2Id = auth2Response.body.data.user.organizationId;

    // Create a proposal for Org 2
    const proposal2Response = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Authorization', `Bearer ${org2Token}`)
      .send({
        title: 'Org 2 Confidential Proposal',
        rfpNumber: 'ORG2-CONFIDENTIAL-001',
        status: 'in_progress',
      })
      .expect(201);

    org2ProposalId = proposal2Response.body.data.id;

    // Verify organizations are different
    expect(org1Id).not.toBe(org2Id);
  });

  afterAll(async () => {
    // Cleanup: delete test proposals, users and organizations
    await prisma.proposal.deleteMany({
      where: {
        organizationId: {
          in: [org1Id, org2Id],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test+tenant',
        },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        name: {
          startsWith: 'Test Tenant',
        },
      },
    });

    await app.close();
  });

  describe('Cross-Tenant Read Isolation', () => {
    it('should NOT allow Org 1 to read Org 2 proposal by ID (GET /proposals/:id)', async () => {
      // Org 1 tries to read Org 2's proposal
      const response = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${org2ProposalId}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(404); // Should return 404 (not 403) for security

      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('status', 404);
    });

    it('should NOT allow Org 2 to read Org 1 proposal by ID (GET /proposals/:id)', async () => {
      // Org 2 tries to read Org 1's proposal
      const response = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${org1ProposalId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);

      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('status', 404);
    });

    it('should only return proposals from own organization in list (GET /proposals)', async () => {
      // Org 1 lists proposals - should only see Org 1 proposals
      const org1Response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      expect(org1Response.body).toHaveProperty('data');
      expect(org1Response.body.data).toHaveProperty('data');
      expect(Array.isArray(org1Response.body.data.data)).toBe(true);

      // All proposals should belong to Org 1
      org1Response.body.data.data.forEach((proposal: { organizationId: string }) => {
        expect(proposal.organizationId).toBe(org1Id);
      });

      // Org 2 lists proposals - should only see Org 2 proposals
      const org2Response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      expect(org2Response.body).toHaveProperty('data');
      expect(org2Response.body.data).toHaveProperty('data');
      expect(Array.isArray(org2Response.body.data.data)).toBe(true);

      // All proposals should belong to Org 2
      org2Response.body.data.data.forEach((proposal: { organizationId: string }) => {
        expect(proposal.organizationId).toBe(org2Id);
      });
    });

    it('should not leak data through search filter (GET /proposals?search=)', async () => {
      // Org 1 searches for "Confidential" (Org 2's proposal title)
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ search: 'Confidential' })
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data.length).toBe(0); // Should find nothing

      // Org 1 searches for "Secret" (their own proposal title)
      const ownResponse = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ search: 'Secret' })
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      expect(ownResponse.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should not leak data through status filter (GET /proposals?status=)', async () => {
      // Org 1 filters by "in_progress" (Org 2's proposal status)
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ status: 'in_progress' })
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      // Should not contain Org 2's proposal
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('data');
      response.body.data.data.forEach((proposal: { organizationId: string }) => {
        expect(proposal.organizationId).toBe(org1Id);
      });
    });
  });

  describe('Cross-Tenant Write Isolation', () => {
    it('should NOT allow Org 1 to update Org 2 proposal (PUT /proposals/:id)', async () => {
      // Org 1 tries to update Org 2's proposal
      const response = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${org2ProposalId}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ title: 'HACKED BY ORG 1' })
        .expect(404); // Filtered out by tenant isolation

      expect(response.body).toHaveProperty('status', 404);

      // Verify Org 2's proposal was NOT modified
      const checkResponse = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${org2ProposalId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      expect(checkResponse.body.data.title).toBe('Org 2 Confidential Proposal');
      expect(checkResponse.body.data.title).not.toBe('HACKED BY ORG 1');
    });

    it('should NOT allow Org 2 to update Org 1 proposal (PUT /proposals/:id)', async () => {
      // Org 2 tries to update Org 1's proposal
      await request(app.getHttpServer())
        .put(`/api/v1/proposals/${org1ProposalId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .send({ title: 'HACKED BY ORG 2' })
        .expect(404);

      // Verify Org 1's proposal was NOT modified
      const checkResponse = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${org1ProposalId}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      expect(checkResponse.body.data.title).toBe('Org 1 Secret Proposal');
    });

    it('should NOT allow Org 1 to delete Org 2 proposal (DELETE /proposals/:id)', async () => {
      // Create a proposal for Org 2 to attempt deletion
      const newProposal = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${org2Token}`)
        .send({
          title: 'Org 2 Delete Test',
          rfpNumber: 'ORG2-DELETE-TEST',
        })
        .expect(201);

      const proposalToDeleteId = newProposal.body.data.id;

      // Org 1 tries to delete Org 2's proposal
      await request(app.getHttpServer())
        .delete(`/api/v1/proposals/${proposalToDeleteId}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(404);

      // Verify proposal was NOT deleted
      const checkResponse = await request(app.getHttpServer())
        .get(`/api/v1/proposals/${proposalToDeleteId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      expect(checkResponse.body.data.id).toBe(proposalToDeleteId);
      expect(checkResponse.body.data.deletedAt).toBeUndefined();
    });
  });

  describe('Automatic organization_id Injection', () => {
    it('should automatically inject organization_id on create (POST /proposals)', async () => {
      const createDto = {
        title: 'Auto-Inject Test Proposal',
        rfpNumber: 'AUTO-INJECT-001',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${org1Token}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('organizationId', org1Id);

      // Verify in database directly
      const dbProposal = await prisma.proposal.findUnique({
        where: { id: response.body.data.id },
      });

      expect(dbProposal).not.toBeNull();
      expect(dbProposal?.organizationId).toBe(org1Id);
    });

    it('should NOT allow client to specify organizationId on create (security)', async () => {
      const maliciousDto = {
        title: 'Malicious Proposal',
        organizationId: org2Id, // Trying to inject another org's ID
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${org1Token}`)
        .send(maliciousDto)
        .expect(201);

      // organizationId should be ignored and use the token's org
      expect(response.body.data.organizationId).toBe(org1Id);
      expect(response.body.data.organizationId).not.toBe(org2Id);
    });

    it('should NOT allow client to change organizationId on update (security)', async () => {
      // Create a proposal for Org 1
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ title: 'Org Change Test' })
        .expect(201);

      const proposalId = createResponse.body.data.id;

      // Try to change organizationId via update
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/v1/proposals/${proposalId}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({
          organizationId: org2Id, // Malicious attempt
          title: 'Updated Title',
        })
        .expect(200);

      // organizationId should remain unchanged
      expect(updateResponse.body.data.organizationId).toBe(org1Id);
      expect(updateResponse.body.data.organizationId).not.toBe(org2Id);
    });
  });

  describe('Tenant Context Validation', () => {
    it('should return 401 when accessing protected routes without JWT', async () => {
      // Try to list proposals without auth
      const response = await request(app.getHttpServer()).get('/api/v1/proposals').expect(401);

      expect(response.body).toHaveProperty('detail');
    });

    it('should return 401 when accessing specific proposal without JWT', async () => {
      await request(app.getHttpServer()).get(`/api/v1/proposals/${org1ProposalId}`).expect(401);
    });

    it('should return 401 when creating proposal without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/proposals')
        .send({ title: 'Unauthorized Create' })
        .expect(401);
    });

    it('should return 401 when updating proposal without JWT', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/proposals/${org1ProposalId}`)
        .send({ title: 'Unauthorized Update' })
        .expect(401);
    });

    it('should return 401 when deleting proposal without JWT', async () => {
      await request(app.getHttpServer()).delete(`/api/v1/proposals/${org1ProposalId}`).expect(401);
    });

    it('should return 401 with invalid JWT token', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';

      await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should return 401 with malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('Dashboard Metrics Tenant Isolation', () => {
    it('should return metrics only for own organization', async () => {
      // Get Org 1 metrics
      const org1Metrics = await request(app.getHttpServer())
        .get('/api/v1/dashboard/metrics')
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      expect(org1Metrics.body).toHaveProperty('data');
      expect(org1Metrics.body.data).toHaveProperty('totalProposals');

      // Get Org 2 metrics
      const org2Metrics = await request(app.getHttpServer())
        .get('/api/v1/dashboard/metrics')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      expect(org2Metrics.body).toHaveProperty('data');

      // Both orgs should have independent metrics
      // (exact counts may vary based on test order, but they should be independent)
    });

    it('should not leak metrics from other organizations', async () => {
      // Create 5 additional proposals for Org 1
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/proposals')
          .set('Authorization', `Bearer ${org1Token}`)
          .send({ title: `Org1 Metric Test ${i}` })
          .expect(201);
      }

      // Org 2 metrics should NOT include Org 1's proposals
      const org2Metrics = await request(app.getHttpServer())
        .get('/api/v1/dashboard/metrics')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      // Org 2 should only count their own proposals
      expect(org2Metrics.body.data.totalProposals).toBeLessThanOrEqual(5);
    });
  });

  describe('Multi-Tenant Query Performance', () => {
    it('should execute queries under performance threshold (<500ms)', async () => {
      // Create 50 proposals for Org 1 to test query performance
      const createPromises = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(
          request(app.getHttpServer())
            .post('/api/v1/proposals')
            .set('Authorization', `Bearer ${org1Token}`)
            .send({ title: `Performance Test Proposal ${i}` }),
        );
      }
      await Promise.all(createPromises);

      // Measure query time
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);
      const elapsed = Date.now() - startTime;

      expect(response.body).toHaveProperty('data');
      expect(elapsed).toBeLessThan(500); // P95 requirement: <500ms
    });

    it('should maintain performance with pagination', async () => {
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);
      const elapsed = Date.now() - startTime;

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('meta');
      expect(elapsed).toBeLessThan(500);
    });

    it('should maintain performance with search filter', async () => {
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/api/v1/proposals')
        .query({ search: 'Performance' })
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);
      const elapsed = Date.now() - startTime;

      expect(response.body).toHaveProperty('data');
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Organization Endpoints Tenant Isolation', () => {
    it('should return 404 when Org 1 tries to get Org 2 details', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/organizations/${org2Id}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(404);
    });

    it('should NOT allow Org 1 to update Org 2', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${org2Id}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ name: 'HACKED ORG NAME' })
        .expect(404);
    });

    it('should return own organization details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${org1Id}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', org1Id);
    });
  });

  describe('Concurrent Request Isolation', () => {
    it('should maintain tenant isolation under concurrent requests', async () => {
      // Send concurrent requests from both organizations
      const requests = [
        // Org 1 requests
        request(app.getHttpServer())
          .get('/api/v1/proposals')
          .set('Authorization', `Bearer ${org1Token}`),
        request(app.getHttpServer())
          .get('/api/v1/proposals')
          .set('Authorization', `Bearer ${org1Token}`),
        // Org 2 requests
        request(app.getHttpServer())
          .get('/api/v1/proposals')
          .set('Authorization', `Bearer ${org2Token}`),
        request(app.getHttpServer())
          .get('/api/v1/proposals')
          .set('Authorization', `Bearer ${org2Token}`),
      ];

      const responses = await Promise.all(requests);

      // First two responses (Org 1) should only contain Org 1 data
      responses.slice(0, 2).forEach((response) => {
        expect(response.status).toBe(200);
        response.body.data.data.forEach((proposal: { organizationId: string }) => {
          expect(proposal.organizationId).toBe(org1Id);
        });
      });

      // Last two responses (Org 2) should only contain Org 2 data
      responses.slice(2, 4).forEach((response) => {
        expect(response.status).toBe(200);
        response.body.data.data.forEach((proposal: { organizationId: string }) => {
          expect(proposal.organizationId).toBe(org2Id);
        });
      });
    });

    it('should maintain isolation during concurrent writes', async () => {
      // Send concurrent create requests from both organizations
      const requests = [
        request(app.getHttpServer())
          .post('/api/v1/proposals')
          .set('Authorization', `Bearer ${org1Token}`)
          .send({ title: 'Concurrent Org1 Proposal' }),
        request(app.getHttpServer())
          .post('/api/v1/proposals')
          .set('Authorization', `Bearer ${org2Token}`)
          .send({ title: 'Concurrent Org2 Proposal' }),
      ];

      const responses = await Promise.all(requests);

      // Verify each proposal belongs to correct org
      expect(responses[0].body.data.organizationId).toBe(org1Id);
      expect(responses[1].body.data.organizationId).toBe(org2Id);
    });
  });
});
