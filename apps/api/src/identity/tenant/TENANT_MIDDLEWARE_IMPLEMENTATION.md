# Prisma Tenant Middleware Implementation Guide

## Overview

Este documento descreve a implementação do middleware Prisma para filtrar automaticamente queries por `organization_id` baseado no TenantContext.

## Status Atual

⚠️ **IMPLEMENTAÇÃO PENDENTE** ⚠️

O projeto atualmente usa Prisma Client 6.19.1, que removeu suporte para `$use` middleware.

Para implementar o isolamento de tenants automaticamente, precisamos migrar para **Prisma Client Extensions** ou criar um **wrapper service**.

## Abordagem Recomendada: Prisma Client Extension

### 1. Criar Client Extension para Tenant Filtering

```typescript
// apps/api/src/identity/tenant/prisma-tenant.extension.ts
import { Prisma } from '@prisma/client';
import { TenantContext } from './tenant.context';

export function createTenantExtension(tenantContext: TenantContext) {
  return Prisma.defineExtension({
    name: 'TenantExtension',
    query: {
      // Models que suportam multi-tenancy
      $allModels: {
        // Intercept all query operations
        async $allOperations({ operation, model, args, query }) {
          // Lista de models tenant-scoped
          const TENANT_MODELS = [
            'User',
            'Proposal',
            'ProposalSection',
            'Question',
            'Response',
            'Document',
            'Chunk',
            'LibraryEntry',
          ];

          // Skip if not a tenant model
          if (!TENANT_MODELS.includes(model)) {
            return query(args);
          }

          // Skip if tenant context not initialized
          if (!tenantContext.isInitialized) {
            return query(args);
          }

          const organizationId = tenantContext.organizationId;

          // Inject organizationId based on operation type
          switch (operation) {
            case 'findUnique':
            case 'findFirst':
            case 'findMany':
            case 'update':
            case 'updateMany':
            case 'delete':
            case 'deleteMany':
              args.where = {
                ...args.where,
                organizationId,
              };
              break;

            case 'create':
              args.data = {
                ...args.data,
                organizationId,
              };
              break;

            case 'createMany':
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item) => ({
                  ...item,
                  organizationId,
                }));
              }
              break;
          }

          return query(args);
        },
      },
    },
  });
}
```

### 2. Criar PrismaService com Extension

```typescript
// apps/api/src/common/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '@/identity/tenant/tenant.context';
import { createTenantExtension } from '@/identity/tenant/prisma-tenant.extension';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;
  public client: any; // Extended client

  constructor(private readonly tenantContext: TenantContext) {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Apply tenant extension
    this.client = this.prisma.$extends(createTenantExtension(tenantContext));
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // Delegate all Prisma operations to the extended client
  get user() {
    return this.client.user;
  }

  get proposal() {
    return this.client.proposal;
  }

  get document() {
    return this.client.document;
  }

  // ... add other models as needed
}
```

### 3. Usar PrismaService nos Controllers/Services

```typescript
// apps/api/src/proposal/proposal.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

@Injectable()
export class ProposalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // organizationId é injetado automaticamente
    return this.prisma.proposal.findMany();
  }

  async create(data: CreateProposalDto) {
    // organizationId é injetado automaticamente
    return this.prisma.proposal.create({ data });
  }
}
```

## Abordagem Alternativa: Wrapper Service

Se Client Extensions não forem viáveis, criar um wrapper service:

```typescript
// apps/api/src/common/tenant-aware-prisma.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '@/identity/tenant/tenant.context';

@Injectable()
export class TenantAwarePrismaService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantContext: TenantContext,
  ) {}

  // Wrap each model with tenant filtering
  get proposal() {
    return {
      findMany: async (args?: any) => {
        return this.prisma.proposal.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId: this.tenantContext.organizationId,
          },
        });
      },
      create: async (args: any) => {
        return this.prisma.proposal.create({
          ...args,
          data: {
            ...args.data,
            organizationId: this.tenantContext.organizationId,
          },
        });
      },
      // ... implement other operations
    };
  }

  // Repeat for each tenant-scoped model
}
```

## Migration Steps

1. ✅ **TenantContext implementado** (#168)
2. ✅ **TenantGuard implementado** (#168)
3. ⚠️ **Escolher abordagem**: Client Extension ou Wrapper Service
4. ⚠️ **Implementar PrismaService** com tenant filtering
5. ⚠️ **Migrar todos services** para usar PrismaService
6. ⚠️ **Adicionar testes de integração** validando isolamento
7. ⚠️ **Atualizar documentação**

## Testing Strategy

### Unit Tests

Testar Client Extension ou Wrapper isoladamente com mock do TenantContext.

### Integration Tests

```typescript
describe('Tenant Isolation (E2E)', () => {
  it('should only return data for current tenant', async () => {
    // Create proposals for org-1
    tenantContext.organizationId = 'org-1';
    await prisma.proposal.create({ data: { title: 'Proposal 1' } });

    // Create proposals for org-2
    tenantContext.organizationId = 'org-2';
    await prisma.proposal.create({ data: { title: 'Proposal 2' } });

    // Query as org-1
    tenantContext.organizationId = 'org-1';
    const proposals = await prisma.proposal.findMany();

    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toBe('Proposal 1');
  });

  it('should prevent cross-tenant data access', async () => {
    // Create proposal for org-1
    tenantContext.organizationId = 'org-1';
    const proposal = await prisma.proposal.create({
      data: { title: 'Secret Proposal' },
    });

    // Try to access as org-2
    tenantContext.organizationId = 'org-2';
    const result = await prisma.proposal.findUnique({
      where: { id: proposal.id },
    });

    expect(result).toBeNull(); // Should not find it
  });
});
```

## Security Considerations

1. **Never skip tenant filtering** in production code
2. **Audit all raw queries** - ensure they include organization_id
3. **Test cross-tenant isolation** rigorously
4. **Monitor for data leakage** in production logs
5. **Document exceptions** where global access is needed (admin functions)

## References

- [Prisma Client Extensions](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions)
- [Multi-Tenancy Patterns](https://www.prisma.io/blog/multi-tenancy-patterns-in-prisma)
- [Row-Level Security with Prisma](https://www.prisma.io/blog/row-level-security-with-prisma)

## Next Steps

- [ ] Escolher abordagem (Client Extension recomendada)
- [ ] Implementar PrismaService
- [ ] Migrar services existentes
- [ ] Adicionar testes de integração
- [ ] Validar em ambiente de staging
- [ ] Deploy para produção

---

**Última atualização:** 2026-01-16
**Issue:** #169 - Implementar Prisma Tenant Middleware
