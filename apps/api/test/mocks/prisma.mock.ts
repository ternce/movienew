/**
 * Prisma Client Mock
 *
 * Mock implementation of PrismaService for testing.
 * Provides chainable query builders with in-memory storage.
 */

import { MockUser } from '../factories/user.factory';

type MockData = {
  user: MockUser[];
  userSession: any[];
  partnerRelationship: any[];
  [key: string]: any[];
};

export class MockPrismaService {
  private data: MockData = {
    user: [],
    userSession: [],
    partnerRelationship: [],
  };

  /**
   * Reset all data
   */
  reset(): void {
    this.data = {
      user: [],
      userSession: [],
      partnerRelationship: [],
    };
  }

  /**
   * Seed test data
   */
  seed(model: keyof MockData, records: any[]): void {
    this.data[model] = [...records];
  }

  /**
   * Get all data for a model
   */
  getData(model: keyof MockData): any[] {
    return [...this.data[model]];
  }

  // ============================================
  // User Model
  // ============================================

  get user() {
    return {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const users = this.data.user;
        if (where.id) {
          return Promise.resolve(users.find((u) => u.id === where.id) || null);
        }
        if (where.email) {
          return Promise.resolve(users.find((u) => u.email === where.email.toLowerCase()) || null);
        }
        if (where.referralCode) {
          return Promise.resolve(users.find((u) => u.referralCode === where.referralCode) || null);
        }
        return Promise.resolve(null);
      }),

      findFirst: jest.fn().mockImplementation(({ where }) => {
        const users = this.data.user;
        return Promise.resolve(
          users.find((u) => {
            if (where.email) return u.email === where.email.toLowerCase();
            if (where.referralCode) return u.referralCode === where.referralCode;
            return false;
          }) || null,
        );
      }),

      findMany: jest.fn().mockImplementation(({ where, orderBy, take, skip } = {}) => {
        let users = [...this.data.user];

        if (where) {
          users = users.filter((u) => {
            if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
            if (where.role && u.role !== where.role) return false;
            if (where.referredById && u.referredById !== where.referredById) return false;
            return true;
          });
        }

        if (orderBy) {
          const key = Object.keys(orderBy)[0];
          const direction = orderBy[key];
          users.sort((a, b) => {
            if (direction === 'asc') return a[key] > b[key] ? 1 : -1;
            return a[key] < b[key] ? 1 : -1;
          });
        }

        if (skip) users = users.slice(skip);
        if (take) users = users.slice(0, take);

        return Promise.resolve(users);
      }),

      create: jest.fn().mockImplementation(({ data }) => {
        const newUser = {
          id: data.id || `mock-${Date.now()}`,
          ...data,
          email: data.email.toLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.data.user.push(newUser);
        return Promise.resolve(newUser);
      }),

      update: jest.fn().mockImplementation(({ where, data }) => {
        const index = this.data.user.findIndex((u) => u.id === where.id);
        if (index === -1) {
          throw new Error('Record not found');
        }
        const updated = {
          ...this.data.user[index],
          ...data,
          updatedAt: new Date(),
        };
        this.data.user[index] = updated;
        return Promise.resolve(updated);
      }),

      delete: jest.fn().mockImplementation(({ where }) => {
        const index = this.data.user.findIndex((u) => u.id === where.id);
        if (index === -1) {
          throw new Error('Record not found');
        }
        const [deleted] = this.data.user.splice(index, 1);
        return Promise.resolve(deleted);
      }),

      count: jest.fn().mockImplementation(({ where } = {}) => {
        let users = this.data.user;
        if (where) {
          users = users.filter((u) => {
            if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
            if (where.role && u.role !== where.role) return false;
            return true;
          });
        }
        return Promise.resolve(users.length);
      }),
    };
  }

  // ============================================
  // UserSession Model
  // ============================================

  get userSession() {
    return {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const sessions = this.data.userSession;
        if (where.id) {
          return Promise.resolve(sessions.find((s) => s.id === where.id) || null);
        }
        if (where.tokenHash) {
          return Promise.resolve(sessions.find((s) => s.tokenHash === where.tokenHash) || null);
        }
        return Promise.resolve(null);
      }),

      findFirst: jest.fn().mockImplementation(({ where }) => {
        const sessions = this.data.userSession;
        return Promise.resolve(
          sessions.find((s) => {
            if (where.tokenHash && s.tokenHash !== where.tokenHash) return false;
            if (where.userId && s.userId !== where.userId) return false;
            if (where.expiresAt?.gt && s.expiresAt <= where.expiresAt.gt) return false;
            return true;
          }) || null,
        );
      }),

      findMany: jest.fn().mockImplementation(({ where } = {}) => {
        let sessions = [...this.data.userSession];
        if (where) {
          sessions = sessions.filter((s) => {
            if (where.userId && s.userId !== where.userId) return false;
            if (where.expiresAt?.gt && s.expiresAt <= where.expiresAt.gt) return false;
            return true;
          });
        }
        return Promise.resolve(sessions);
      }),

      create: jest.fn().mockImplementation(({ data }) => {
        const newSession = {
          id: data.id || `session-${Date.now()}`,
          ...data,
          createdAt: new Date(),
        };
        this.data.userSession.push(newSession);
        return Promise.resolve(newSession);
      }),

      delete: jest.fn().mockImplementation(({ where }) => {
        const index = this.data.userSession.findIndex((s) => s.tokenHash === where.tokenHash);
        if (index === -1) {
          return Promise.resolve(null);
        }
        const [deleted] = this.data.userSession.splice(index, 1);
        return Promise.resolve(deleted);
      }),

      deleteMany: jest.fn().mockImplementation(({ where }) => {
        const initialLength = this.data.userSession.length;
        this.data.userSession = this.data.userSession.filter((s) => {
          if (where.userId && s.userId === where.userId) return false;
          if (where.tokenHash && s.tokenHash === where.tokenHash) return false;
          return true;
        });
        return Promise.resolve({ count: initialLength - this.data.userSession.length });
      }),
    };
  }

  // ============================================
  // PartnerRelationship Model
  // ============================================

  get partnerRelationship() {
    return {
      findMany: jest.fn().mockImplementation(({ where, orderBy, take } = {}) => {
        let relations = [...this.data.partnerRelationship];

        if (where) {
          relations = relations.filter((r) => {
            if (where.partnerId && r.partnerId !== where.partnerId) return false;
            if (where.referralId && r.referralId !== where.referralId) return false;
            return true;
          });
        }

        if (orderBy) {
          const key = Object.keys(orderBy)[0];
          const direction = orderBy[key];
          relations.sort((a, b) => {
            if (direction === 'asc') return a[key] > b[key] ? 1 : -1;
            return a[key] < b[key] ? 1 : -1;
          });
        }

        if (take) relations = relations.slice(0, take);

        return Promise.resolve(relations);
      }),

      create: jest.fn().mockImplementation(({ data }) => {
        const newRelation = {
          id: data.id || `relation-${Date.now()}`,
          ...data,
          createdAt: new Date(),
        };
        this.data.partnerRelationship.push(newRelation);
        return Promise.resolve(newRelation);
      }),
    };
  }

  // ============================================
  // Transaction Support
  // ============================================

  async $transaction<T>(
    fn: (prisma: MockPrismaService) => Promise<T>,
  ): Promise<T> {
    // Simple implementation - just execute the function
    // In a real scenario, you might want to implement rollback
    return fn(this);
  }

  // ============================================
  // Connection Methods
  // ============================================

  async $connect(): Promise<void> {
    // No-op for mock
  }

  async $disconnect(): Promise<void> {
    // No-op for mock
  }
}

/**
 * Create a fresh mock Prisma service instance
 */
export function createMockPrismaService(): MockPrismaService {
  return new MockPrismaService();
}

/**
 * Create Jest mock for PrismaService
 */
export function createPrismaServiceMock() {
  const mock = new MockPrismaService();
  return {
    instance: mock,
    user: mock.user,
    userSession: mock.userSession,
    partnerRelationship: mock.partnerRelationship,
    $transaction: jest.fn().mockImplementation((fn) => mock.$transaction(fn)),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
}

export default MockPrismaService;
