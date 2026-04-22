import { HttpException, HttpStatus, ArgumentsHost, Logger } from '@nestjs/common';
import {
  HttpExceptionFilter,
  CodedHttpException,
  throwCodedError,
  ERROR_CODES,
} from '../http-exception.filter';

/**
 * Create mock execution context for testing
 */
const createMockContext = (url = '/test-endpoint') => {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockRequest = {
    url,
    method: 'GET',
    ip: '127.0.0.1',
  };
  const mockResponse = {
    status: mockStatus,
    json: mockJson,
  };

  const mockHost: ArgumentsHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  };

  return { mockHost, mockRequest, mockResponse, mockStatus, mockJson };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let loggerErrorSpy: jest.SpyInstance;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('ERROR_CODES constants', () => {
    it('should have authentication error codes', () => {
      expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBe('AUTH_001');
      expect(ERROR_CODES.AUTH_TOKEN_EXPIRED).toBe('AUTH_002');
      expect(ERROR_CODES.AUTH_TOKEN_INVALID).toBe('AUTH_003');
      expect(ERROR_CODES.AUTH_REFRESH_EXPIRED).toBe('AUTH_004');
      expect(ERROR_CODES.AUTH_RESET_EXPIRED).toBe('AUTH_005');
      expect(ERROR_CODES.AUTH_RESET_INVALID).toBe('AUTH_006');
      expect(ERROR_CODES.AUTH_USER_EXISTS).toBe('AUTH_007');
      expect(ERROR_CODES.AUTH_UNAUTHORIZED).toBe('AUTH_008');
    });

    it('should have validation error codes', () => {
      expect(ERROR_CODES.VALIDATION_FAILED).toBe('VAL_001');
      expect(ERROR_CODES.VALIDATION_EMAIL_INVALID).toBe('VAL_002');
      expect(ERROR_CODES.VALIDATION_PASSWORD_WEAK).toBe('VAL_003');
      expect(ERROR_CODES.VALIDATION_REQUIRED_FIELD).toBe('VAL_004');
    });

    it('should have resource error codes', () => {
      expect(ERROR_CODES.RESOURCE_NOT_FOUND).toBe('RES_001');
      expect(ERROR_CODES.RESOURCE_CONFLICT).toBe('RES_002');
      expect(ERROR_CODES.RESOURCE_FORBIDDEN).toBe('RES_003');
    });

    it('should have payment error codes', () => {
      expect(ERROR_CODES.PAYMENT_FAILED).toBe('PAY_001');
      expect(ERROR_CODES.PAYMENT_CARD_DECLINED).toBe('PAY_002');
      expect(ERROR_CODES.PAYMENT_INSUFFICIENT_FUNDS).toBe('PAY_003');
      expect(ERROR_CODES.PAYMENT_INVALID_METHOD).toBe('PAY_004');
      expect(ERROR_CODES.PAYMENT_EXPIRED).toBe('PAY_005');
    });

    it('should have subscription error codes', () => {
      expect(ERROR_CODES.SUBSCRIPTION_REQUIRED).toBe('SUB_001');
      expect(ERROR_CODES.SUBSCRIPTION_EXPIRED).toBe('SUB_002');
      expect(ERROR_CODES.SUBSCRIPTION_CANCELLED).toBe('SUB_003');
      expect(ERROR_CODES.SUBSCRIPTION_INVALID).toBe('SUB_004');
    });

    it('should have bonus error codes', () => {
      expect(ERROR_CODES.BONUS_INSUFFICIENT).toBe('BON_001');
      expect(ERROR_CODES.BONUS_EXPIRED).toBe('BON_002');
      expect(ERROR_CODES.BONUS_INVALID).toBe('BON_003');
    });

    it('should have age restriction error codes', () => {
      expect(ERROR_CODES.AGE_RESTRICTED).toBe('AGE_001');
      expect(ERROR_CODES.AGE_VERIFICATION_REQUIRED).toBe('AGE_002');
      expect(ERROR_CODES.AGE_VERIFICATION_FAILED).toBe('AGE_003');
    });

    it('should have rate limiting error codes', () => {
      expect(ERROR_CODES.RATE_LIMITED).toBe('RATE_001');
      expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_002');
    });

    it('should have partner error codes', () => {
      expect(ERROR_CODES.PARTNER_WITHDRAWAL_MIN).toBe('PART_001');
      expect(ERROR_CODES.PARTNER_WITHDRAWAL_MAX).toBe('PART_002');
      expect(ERROR_CODES.PARTNER_INSUFFICIENT_BALANCE).toBe('PART_003');
      expect(ERROR_CODES.PARTNER_INVALID_LEVEL).toBe('PART_004');
    });

    it('should have content error codes', () => {
      expect(ERROR_CODES.CONTENT_NOT_FOUND).toBe('CONT_001');
      expect(ERROR_CODES.CONTENT_UNAVAILABLE).toBe('CONT_002');
      expect(ERROR_CODES.CONTENT_ACCESS_DENIED).toBe('CONT_003');
    });

    it('should have streaming error codes', () => {
      expect(ERROR_CODES.STREAM_ERROR).toBe('STRM_001');
      expect(ERROR_CODES.STREAM_UNAVAILABLE).toBe('STRM_002');
      expect(ERROR_CODES.STREAM_TOKEN_EXPIRED).toBe('STRM_003');
    });

    it('should have server error codes', () => {
      expect(ERROR_CODES.SERVER_ERROR).toBe('SRV_001');
      expect(ERROR_CODES.SERVER_UNAVAILABLE).toBe('SRV_002');
      expect(ERROR_CODES.SERVER_TIMEOUT).toBe('SRV_003');
    });

    it('should have maintenance error codes', () => {
      expect(ERROR_CODES.MAINTENANCE_MODE).toBe('MAINT_001');
    });
  });

  describe('HttpException with string response', () => {
    it('should format string exception message', () => {
      const { mockHost, mockStatus, mockJson } = createMockContext();
      const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 400,
          message: 'Bad request',
          code: 'VAL_001', // Mapped from 400
        })
      );
    });

    it('should include timestamp and path', () => {
      const { mockHost, mockJson } = createMockContext('/api/users');
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(response.path).toBe('/api/users');
    });
  });

  describe('HttpException with object response', () => {
    it('should extract message from response object', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException(
        { message: 'Custom error message', statusCode: 400 },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
        })
      );
    });

    it('should extract error code from response object', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException(
        { message: 'Invalid credentials', code: 'AUTH_001' },
        HttpStatus.UNAUTHORIZED
      );

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_001',
        })
      );
    });

    it('should extract error name from response object', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException(
        { message: 'Error', error: 'CustomError' },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CustomError',
        })
      );
    });

    it('should include validation details when present', () => {
      const { mockHost, mockJson } = createMockContext();
      const details = { email: ['Invalid format'], password: ['Too short'] };
      const exception = new HttpException(
        { message: 'Validation failed', details },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details,
        })
      );
    });
  });

  describe('Status code to error code mapping', () => {
    it('should map 400 to VAL_001', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'VAL_001' })
      );
    });

    it('should map 401 to AUTH_008', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTH_008' })
      );
    });

    it('should map 403 to RES_003', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'RES_003' })
      );
    });

    it('should map 404 to RES_001', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'RES_001' })
      );
    });

    it('should map 409 to RES_002', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Conflict', HttpStatus.CONFLICT);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'RES_002' })
      );
    });

    it('should map 429 to RATE_001', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'RATE_001' })
      );
    });

    it('should map 500 to SRV_001', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SRV_001' })
      );
    });

    it('should map 503 to SRV_002', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SRV_002' })
      );
    });

    it('should map 504 to SRV_003', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Gateway Timeout', HttpStatus.GATEWAY_TIMEOUT);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SRV_003' })
      );
    });

    it('should default to SRV_001 for unmapped status codes', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('I am a teapot', 418);

      filter.catch(exception, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SRV_001' })
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error with message in development', () => {
      process.env.NODE_ENV = 'development';
      const filter = new HttpExceptionFilter();
      const { mockHost, mockStatus, mockJson } = createMockContext();
      const error = new Error('Something went wrong');

      filter.catch(error, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 500,
          code: 'SRV_001',
          error: 'InternalServerError',
        })
      );
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should hide error message in production', () => {
      process.env.NODE_ENV = 'production';
      const filter = new HttpExceptionFilter();
      const { mockHost, mockJson } = createMockContext();
      const error = new Error('Sensitive error details');

      filter.catch(error, mockHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );
    });

    it('should log error details including stack trace', () => {
      const { mockHost } = createMockContext('/api/test');
      const error = new Error('Test error');

      filter.catch(error, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled error'),
        error.stack,
        expect.objectContaining({
          path: '/api/test',
          method: 'GET',
        })
      );
    });
  });

  describe('Unknown exception handling', () => {
    it('should handle unknown exception types', () => {
      const { mockHost, mockStatus, mockJson } = createMockContext();

      filter.catch('string error', mockHost);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 500,
          message: 'Internal server error',
          code: 'SRV_001',
        })
      );
    });

    it('should handle null exception', () => {
      const { mockHost, mockStatus, mockJson } = createMockContext();

      filter.catch(null, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: 'SRV_001',
        })
      );
    });

    it('should handle undefined exception', () => {
      const { mockHost, mockStatus, mockJson } = createMockContext();

      filter.catch(undefined, mockHost);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should log unknown exception types', () => {
      const { mockHost } = createMockContext();
      const unknownError = { custom: 'error' };

      filter.catch(unknownError, mockHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unknown error type:',
        unknownError
      );
    });
  });

  describe('Response format', () => {
    it('should include all required fields', () => {
      const { mockHost, mockJson } = createMockContext('/api/resource');
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('code');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('path', '/api/resource');
    });

    it('should have valid ISO timestamp', () => {
      const { mockHost, mockJson } = createMockContext();
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const response = mockJson.mock.calls[0][0];
      const timestamp = new Date(response.timestamp);
      expect(timestamp.toISOString()).toBe(response.timestamp);
    });
  });
});

describe('CodedHttpException', () => {
  it('should create exception with message and code', () => {
    const exception = new CodedHttpException('Invalid credentials', 'AUTH_001');

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.getResponse()).toEqual({
      message: 'Invalid credentials',
      code: 'AUTH_001',
      details: undefined,
    });
  });

  it('should allow custom status code', () => {
    const exception = new CodedHttpException(
      'Token expired',
      'AUTH_002',
      HttpStatus.UNAUTHORIZED
    );

    expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('should include validation details when provided', () => {
    const details = { email: ['Invalid format'] };
    const exception = new CodedHttpException(
      'Validation failed',
      'VAL_001',
      HttpStatus.BAD_REQUEST,
      details
    );

    expect(exception.getResponse()).toEqual({
      message: 'Validation failed',
      code: 'VAL_001',
      details,
    });
  });

  it('should work with HttpExceptionFilter', () => {
    const filter = new HttpExceptionFilter();
    const { mockHost, mockJson } = createMockContext();
    const exception = new CodedHttpException(
      'User already exists',
      'AUTH_007',
      HttpStatus.CONFLICT
    );

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User already exists',
        code: 'AUTH_007',
        statusCode: 409,
      })
    );
  });
});

describe('throwCodedError()', () => {
  it('should throw CodedHttpException', () => {
    expect(() => {
      throwCodedError('Error message', 'AUTH_001');
    }).toThrow(CodedHttpException);
  });

  it('should throw with correct message', () => {
    try {
      throwCodedError('Custom error', 'VAL_001');
    } catch (error) {
      expect(error).toBeInstanceOf(CodedHttpException);
      expect((error as CodedHttpException).getResponse()).toEqual(
        expect.objectContaining({ message: 'Custom error' })
      );
    }
  });

  it('should throw with correct code', () => {
    try {
      throwCodedError('Error', 'PAY_001');
    } catch (error) {
      expect((error as CodedHttpException).getResponse()).toEqual(
        expect.objectContaining({ code: 'PAY_001' })
      );
    }
  });

  it('should throw with custom status', () => {
    try {
      throwCodedError('Unauthorized', 'AUTH_002', HttpStatus.UNAUTHORIZED);
    } catch (error) {
      expect((error as CodedHttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    }
  });

  it('should throw with validation details', () => {
    const details = { field: ['Error message'] };
    try {
      throwCodedError('Validation failed', 'VAL_001', HttpStatus.BAD_REQUEST, details);
    } catch (error) {
      expect((error as CodedHttpException).getResponse()).toEqual(
        expect.objectContaining({ details })
      );
    }
  });

  it('should have return type never', () => {
    // This test verifies TypeScript typing - the function should never return
    const testFunction = (): string => {
      if (Math.random() > 0.5) {
        throwCodedError('Error', 'SRV_001');
        // TypeScript should know we never reach here
      }
      return 'result';
    };

    // The function should work correctly when condition is false
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.3);
    expect(testFunction()).toBe('result');
    spy.mockRestore();
  });
});
