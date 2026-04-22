import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, Controller, Get, Post, Body } from '@nestjs/common';
import * as request from 'supertest';
import {
  HttpExceptionFilter,
  CodedHttpException,
  throwCodedError,
  ERROR_CODES,
} from '../src/common/filters/http-exception.filter';
import { BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';

/**
 * Test controller for error handling scenarios
 */
@Controller('test')
class TestController {
  @Get('success')
  getSuccess() {
    return { message: 'success' };
  }

  @Get('bad-request')
  getBadRequest() {
    throw new BadRequestException('Invalid input');
  }

  @Get('unauthorized')
  getUnauthorized() {
    throw new UnauthorizedException('Authentication required');
  }

  @Get('forbidden')
  getForbidden() {
    throw new ForbiddenException('Access denied');
  }

  @Get('not-found')
  getNotFound() {
    throw new NotFoundException('Resource not found');
  }

  @Get('conflict')
  getConflict() {
    throw new ConflictException('Resource already exists');
  }

  @Get('rate-limited')
  getRateLimited() {
    throw new CodedHttpException(
      'Too many requests',
      ERROR_CODES.RATE_LIMITED,
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  @Get('server-error')
  getServerError() {
    throw new Error('Unexpected server error');
  }

  @Get('coded-error')
  getCodedError() {
    throw new CodedHttpException(
      'Invalid credentials',
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      HttpStatus.UNAUTHORIZED
    );
  }

  @Post('validation')
  postValidation(@Body() body: { email: string }) {
    if (!body.email || !body.email.includes('@')) {
      throw new CodedHttpException(
        'Validation failed',
        ERROR_CODES.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        { email: ['Invalid email format'] }
      );
    }
    return { success: true };
  }

  @Get('throw-coded')
  getThrowCoded() {
    throwCodedError(
      'Subscription required',
      ERROR_CODES.SUBSCRIPTION_REQUIRED,
      HttpStatus.PAYMENT_REQUIRED
    );
  }

  @Get('null-error')
  getNullError() {
    throw null;
  }

  @Get('undefined-error')
  getUndefinedError() {
    throw undefined;
  }

  @Get('string-error')
  getStringError() {
    throw 'String error message';
  }

  @Get('payment-error')
  getPaymentError() {
    throw new CodedHttpException(
      'Payment declined',
      ERROR_CODES.PAYMENT_CARD_DECLINED,
      HttpStatus.PAYMENT_REQUIRED
    );
  }

  @Get('age-restricted')
  getAgeRestricted() {
    throw new CodedHttpException(
      'Content restricted',
      ERROR_CODES.AGE_RESTRICTED,
      HttpStatus.FORBIDDEN
    );
  }

  @Get('bonus-error')
  getBonusError() {
    throw new CodedHttpException(
      'Insufficient bonuses',
      ERROR_CODES.BONUS_INSUFFICIENT,
      HttpStatus.BAD_REQUEST
    );
  }

  @Get('content-unavailable')
  getContentUnavailable() {
    throw new CodedHttpException(
      'Content temporarily unavailable',
      ERROR_CODES.CONTENT_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  @Get('maintenance')
  getMaintenance() {
    throw new CodedHttpException(
      'System under maintenance',
      ERROR_CODES.MAINTENANCE_MODE,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Success Response', () => {
    it('should return 200 for successful request', () => {
      return request(app.getHttpServer())
        .get('/test/success')
        .expect(200)
        .expect({ message: 'success' });
    });
  });

  describe('400 Bad Request', () => {
    it('should return standardized error response', () => {
      return request(app.getHttpServer())
        .get('/test/bad-request')
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 400,
            code: 'VAL_001',
            message: 'Invalid input',
          });
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.path).toBe('/test/bad-request');
        });
    });
  });

  describe('401 Unauthorized', () => {
    it('should return AUTH_008 code', () => {
      return request(app.getHttpServer())
        .get('/test/unauthorized')
        .expect(401)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 401,
            code: 'AUTH_008',
            message: 'Authentication required',
          });
        });
    });
  });

  describe('403 Forbidden', () => {
    it('should return RES_003 code', () => {
      return request(app.getHttpServer())
        .get('/test/forbidden')
        .expect(403)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 403,
            code: 'RES_003',
            message: 'Access denied',
          });
        });
    });
  });

  describe('404 Not Found', () => {
    it('should return RES_001 code', () => {
      return request(app.getHttpServer())
        .get('/test/not-found')
        .expect(404)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 404,
            code: 'RES_001',
            message: 'Resource not found',
          });
        });
    });

    it('should return RES_001 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/non-existent-route')
        .expect(404)
        .expect((res) => {
          expect(res.body.code).toBe('RES_001');
        });
    });
  });

  describe('409 Conflict', () => {
    it('should return RES_002 code', () => {
      return request(app.getHttpServer())
        .get('/test/conflict')
        .expect(409)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 409,
            code: 'RES_002',
            message: 'Resource already exists',
          });
        });
    });
  });

  describe('429 Too Many Requests', () => {
    it('should return RATE_001 code', () => {
      return request(app.getHttpServer())
        .get('/test/rate-limited')
        .expect(429)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 429,
            code: 'RATE_001',
            message: 'Too many requests',
          });
        });
    });
  });

  describe('500 Server Error', () => {
    it('should return SRV_001 code', () => {
      return request(app.getHttpServer())
        .get('/test/server-error')
        .expect(500)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 500,
            code: 'SRV_001',
          });
        });
    });
  });

  describe('CodedHttpException', () => {
    it('should use custom error code', () => {
      return request(app.getHttpServer())
        .get('/test/coded-error')
        .expect(401)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 401,
            code: 'AUTH_001',
            message: 'Invalid credentials',
          });
        });
    });
  });

  describe('Validation Error with Details', () => {
    it('should include validation details', () => {
      return request(app.getHttpServer())
        .post('/test/validation')
        .send({ email: 'invalid' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 400,
            code: 'VAL_001',
            message: 'Validation failed',
            details: {
              email: ['Invalid email format'],
            },
          });
        });
    });

    it('should pass validation with valid email', () => {
      return request(app.getHttpServer())
        .post('/test/validation')
        .send({ email: 'test@example.com' })
        .expect(201)
        .expect({ success: true });
    });
  });

  describe('throwCodedError helper', () => {
    it('should throw coded exception', () => {
      return request(app.getHttpServer())
        .get('/test/throw-coded')
        .expect(402)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            code: 'SUB_001',
            message: 'Subscription required',
          });
        });
    });
  });

  describe('Unknown Exception Types', () => {
    it('should handle null error', () => {
      return request(app.getHttpServer())
        .get('/test/null-error')
        .expect(500)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 500,
            code: 'SRV_001',
          });
        });
    });

    it('should handle undefined error', () => {
      return request(app.getHttpServer())
        .get('/test/undefined-error')
        .expect(500)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 500,
            code: 'SRV_001',
          });
        });
    });

    it('should handle string error', () => {
      return request(app.getHttpServer())
        .get('/test/string-error')
        .expect(500)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            statusCode: 500,
            code: 'SRV_001',
          });
        });
    });
  });

  describe('Response Format', () => {
    it('should include all required fields', () => {
      return request(app.getHttpServer())
        .get('/test/bad-request')
        .expect((res) => {
          expect(res.body).toHaveProperty('success', false);
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('code');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
        });
    });

    it('should have valid ISO timestamp', () => {
      return request(app.getHttpServer())
        .get('/test/bad-request')
        .expect((res) => {
          const timestamp = new Date(res.body.timestamp);
          expect(timestamp.toISOString()).toBe(res.body.timestamp);
        });
    });

    it('should include correct path', () => {
      return request(app.getHttpServer())
        .get('/test/forbidden')
        .expect((res) => {
          expect(res.body.path).toBe('/test/forbidden');
        });
    });
  });

  describe('Payment Error Codes', () => {
    it('should return PAY_002 for declined card', () => {
      return request(app.getHttpServer())
        .get('/test/payment-error')
        .expect(402)
        .expect((res) => {
          expect(res.body.code).toBe('PAY_002');
        });
    });
  });

  describe('Age Restriction Error Codes', () => {
    it('should return AGE_001 for restricted content', () => {
      return request(app.getHttpServer())
        .get('/test/age-restricted')
        .expect(403)
        .expect((res) => {
          expect(res.body.code).toBe('AGE_001');
        });
    });
  });

  describe('Bonus Error Codes', () => {
    it('should return BON_001 for insufficient bonuses', () => {
      return request(app.getHttpServer())
        .get('/test/bonus-error')
        .expect(400)
        .expect((res) => {
          expect(res.body.code).toBe('BON_001');
        });
    });
  });

  describe('Content Error Codes', () => {
    it('should return CONT_002 for unavailable content', () => {
      return request(app.getHttpServer())
        .get('/test/content-unavailable')
        .expect(503)
        .expect((res) => {
          expect(res.body.code).toBe('CONT_002');
        });
    });
  });

  describe('Maintenance Mode', () => {
    it('should return MAINT_001 for maintenance', () => {
      return request(app.getHttpServer())
        .get('/test/maintenance')
        .expect(503)
        .expect((res) => {
          expect(res.body.code).toBe('MAINT_001');
          expect(res.body.message).toBe('System under maintenance');
        });
    });
  });

  describe('Error Code Categories', () => {
    const testCases = [
      { code: 'AUTH_001', description: 'Authentication errors' },
      { code: 'VAL_001', description: 'Validation errors' },
      { code: 'RES_001', description: 'Resource errors' },
      { code: 'PAY_002', description: 'Payment errors' },
      { code: 'SUB_001', description: 'Subscription errors' },
      { code: 'BON_001', description: 'Bonus errors' },
      { code: 'AGE_001', description: 'Age restriction errors' },
      { code: 'RATE_001', description: 'Rate limiting errors' },
      { code: 'CONT_002', description: 'Content errors' },
      { code: 'MAINT_001', description: 'Maintenance errors' },
    ];

    testCases.forEach(({ code, description }) => {
      it(`should have consistent format for ${description} (${code})`, async () => {
        // Get the appropriate endpoint for each error code
        const endpoints: Record<string, string> = {
          AUTH_001: '/test/coded-error',
          VAL_001: '/test/bad-request',
          RES_001: '/test/not-found',
          PAY_002: '/test/payment-error',
          SUB_001: '/test/throw-coded',
          BON_001: '/test/bonus-error',
          AGE_001: '/test/age-restricted',
          RATE_001: '/test/rate-limited',
          CONT_002: '/test/content-unavailable',
          MAINT_001: '/test/maintenance',
        };

        const res = await request(app.getHttpServer()).get(endpoints[code]);

        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('code');
        expect(res.body).toHaveProperty('message');
        expect(typeof res.body.message).toBe('string');
        expect(res.body.message.length).toBeGreaterThan(0);
      });
    });
  });
});
