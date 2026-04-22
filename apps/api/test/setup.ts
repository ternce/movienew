/**
 * Test Setup Configuration
 *
 * This file is automatically executed before each test file.
 * It sets up the test environment with proper configurations.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(__dirname, '../.env.test') });

// Set default test environment variables if not present
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-minimum-32-chars';
process.env.JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';
process.env.JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4'; // Lower rounds for faster tests

// Test database URL (use same database for testing in dev - tests mock Prisma anyway)
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://movieplatform:movieplatform_dev@localhost:5432/movieplatform';

// Test Redis (use same Redis as development)
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';

// Disable email sending in tests
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests (optional)
// Uncomment if you want cleaner test output
// const originalConsole = { ...console };
// beforeAll(() => {
//   console.log = jest.fn();
//   console.info = jest.fn();
// });
// afterAll(() => {
//   console.log = originalConsole.log;
//   console.info = originalConsole.info;
// });

// Global setup and teardown
beforeAll(async () => {
  // Any global setup before all tests
});

afterAll(async () => {
  // Any global cleanup after all tests
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },

  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid JWT`
          : `Expected ${received} to be a valid JWT`,
    };
  },

  toBeValidISODate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received === date.toISOString();
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid ISO date string`
          : `Expected ${received} to be a valid ISO date string`,
    };
  },
});

// Type declarations for custom matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidJWT(): R;
      toBeValidISODate(): R;
    }
  }
}
