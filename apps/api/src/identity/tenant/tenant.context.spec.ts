/**
 * TenantContext Unit Tests
 *
 * Tests for request-scoped tenant context service.
 */

import { TenantContext } from './tenant.context';

describe('TenantContext', () => {
  let context: TenantContext;

  beforeEach(() => {
    context = new TenantContext();
  });

  describe('initialization', () => {
    it('should not be initialized on creation', () => {
      expect(context.isInitialized).toBe(false);
    });

    it('should throw error when accessing organizationId before initialization', () => {
      expect(() => context.organizationId).toThrow('Tenant context not initialized');
    });
  });

  describe('setting organizationId', () => {
    it('should accept valid organizationId', () => {
      context.organizationId = 'org-123';
      expect(context.organizationId).toBe('org-123');
      expect(context.isInitialized).toBe(true);
    });

    it('should throw error when setting empty string', () => {
      expect(() => {
        context.organizationId = '';
      }).toThrow('Invalid organization ID');
    });

    it('should throw error when setting null', () => {
      expect(() => {
        context.organizationId = null as any;
      }).toThrow('Invalid organization ID');
    });

    it('should throw error when setting undefined', () => {
      expect(() => {
        context.organizationId = undefined as any;
      }).toThrow('Invalid organization ID');
    });

    it('should throw error when setting non-string', () => {
      expect(() => {
        context.organizationId = 123 as any;
      }).toThrow('Invalid organization ID');
    });
  });

  describe('immutability', () => {
    it('should throw error when attempting to change organizationId', () => {
      context.organizationId = 'org-123';

      expect(() => {
        context.organizationId = 'org-456';
      }).toThrow('Tenant context already initialized');
    });

    it('should not allow re-initialization after first set', () => {
      context.organizationId = 'org-123';
      expect(context.organizationId).toBe('org-123');

      expect(() => {
        context.organizationId = 'org-123'; // Same value
      }).toThrow('Tenant context already initialized');
    });
  });

  describe('reset (testing only)', () => {
    it('should reset context to uninitialized state', () => {
      context.organizationId = 'org-123';
      expect(context.isInitialized).toBe(true);

      context.reset();

      expect(context.isInitialized).toBe(false);
      expect(() => context.organizationId).toThrow('Tenant context not initialized');
    });

    it('should allow setting organizationId after reset', () => {
      context.organizationId = 'org-123';
      context.reset();
      context.organizationId = 'org-456';

      expect(context.organizationId).toBe('org-456');
    });
  });

  describe('isInitialized getter', () => {
    it('should return false before setting organizationId', () => {
      expect(context.isInitialized).toBe(false);
    });

    it('should return true after setting organizationId', () => {
      context.organizationId = 'org-123';
      expect(context.isInitialized).toBe(true);
    });

    it('should return false after reset', () => {
      context.organizationId = 'org-123';
      context.reset();
      expect(context.isInitialized).toBe(false);
    });
  });

  describe('error messages', () => {
    it('should provide clear error message when accessing uninitialized', () => {
      expect(() => context.organizationId).toThrow(
        /Tenant context not initialized.*Ensure TenantGuard is applied/,
      );
    });

    it('should provide clear error message when attempting re-initialization', () => {
      context.organizationId = 'org-123';
      expect(() => {
        context.organizationId = 'org-456';
      }).toThrow(/Tenant context already initialized.*Cannot change organization/);
    });

    it('should provide clear error message for invalid organizationId', () => {
      expect(() => {
        context.organizationId = '';
      }).toThrow('Invalid organization ID');
    });
  });

  describe('request scope simulation', () => {
    it('should behave independently across multiple instances', () => {
      const context1 = new TenantContext();
      const context2 = new TenantContext();

      context1.organizationId = 'org-123';
      context2.organizationId = 'org-456';

      expect(context1.organizationId).toBe('org-123');
      expect(context2.organizationId).toBe('org-456');
    });

    it('should not share state between instances', () => {
      const context1 = new TenantContext();
      const context2 = new TenantContext();

      context1.organizationId = 'org-123';

      expect(context1.isInitialized).toBe(true);
      expect(context2.isInitialized).toBe(false);
    });
  });
});
