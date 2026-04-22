import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Standardized error codes for API responses
 */
export const ERROR_CODES = {
  // Authentication errors (AUTH_0XX)
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_TOKEN_INVALID: 'AUTH_003',
  AUTH_REFRESH_EXPIRED: 'AUTH_004',
  AUTH_RESET_EXPIRED: 'AUTH_005',
  AUTH_RESET_INVALID: 'AUTH_006',
  AUTH_USER_EXISTS: 'AUTH_007',
  AUTH_UNAUTHORIZED: 'AUTH_008',

  // Validation errors (VAL_0XX)
  VALIDATION_FAILED: 'VAL_001',
  VALIDATION_EMAIL_INVALID: 'VAL_002',
  VALIDATION_PASSWORD_WEAK: 'VAL_003',
  VALIDATION_REQUIRED_FIELD: 'VAL_004',

  // Resource errors (RES_0XX)
  RESOURCE_NOT_FOUND: 'RES_001',
  RESOURCE_CONFLICT: 'RES_002',
  RESOURCE_FORBIDDEN: 'RES_003',

  // Payment errors (PAY_0XX)
  PAYMENT_FAILED: 'PAY_001',
  PAYMENT_CARD_DECLINED: 'PAY_002',
  PAYMENT_INSUFFICIENT_FUNDS: 'PAY_003',
  PAYMENT_INVALID_METHOD: 'PAY_004',
  PAYMENT_EXPIRED: 'PAY_005',

  // Subscription errors (SUB_0XX)
  SUBSCRIPTION_REQUIRED: 'SUB_001',
  SUBSCRIPTION_EXPIRED: 'SUB_002',
  SUBSCRIPTION_CANCELLED: 'SUB_003',
  SUBSCRIPTION_INVALID: 'SUB_004',

  // Bonus errors (BON_0XX)
  BONUS_INSUFFICIENT: 'BON_001',
  BONUS_EXPIRED: 'BON_002',
  BONUS_INVALID: 'BON_003',

  // Age restriction errors (AGE_0XX)
  AGE_RESTRICTED: 'AGE_001',
  AGE_VERIFICATION_REQUIRED: 'AGE_002',
  AGE_VERIFICATION_FAILED: 'AGE_003',

  // Rate limiting errors (RATE_0XX)
  RATE_LIMITED: 'RATE_001',
  RATE_LIMIT_EXCEEDED: 'RATE_002',

  // Partner errors (PART_0XX)
  PARTNER_WITHDRAWAL_MIN: 'PART_001',
  PARTNER_WITHDRAWAL_MAX: 'PART_002',
  PARTNER_INSUFFICIENT_BALANCE: 'PART_003',
  PARTNER_INVALID_LEVEL: 'PART_004',

  // Content errors (CONT_0XX)
  CONTENT_NOT_FOUND: 'CONT_001',
  CONTENT_UNAVAILABLE: 'CONT_002',
  CONTENT_ACCESS_DENIED: 'CONT_003',

  // Streaming errors (STRM_0XX)
  STREAM_ERROR: 'STRM_001',
  STREAM_UNAVAILABLE: 'STRM_002',
  STREAM_TOKEN_EXPIRED: 'STRM_003',

  // Server errors (SRV_0XX)
  SERVER_ERROR: 'SRV_001',
  SERVER_UNAVAILABLE: 'SRV_002',
  SERVER_TIMEOUT: 'SRV_003',

  // Maintenance (MAINT_0XX)
  MAINTENANCE_MODE: 'MAINT_001',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Map HTTP status codes to default error codes
 */
const STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.AUTH_UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.RESOURCE_FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.RESOURCE_NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.RESOURCE_CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ERROR_CODES.SERVER_ERROR,
  [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_CODES.SERVER_UNAVAILABLE,
  [HttpStatus.GATEWAY_TIMEOUT]: ERROR_CODES.SERVER_TIMEOUT,
};

/**
 * Extended error response interface with error codes
 */
interface ErrorResponse {
  success: false;
  statusCode: number;
  code: ErrorCode;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: Record<string, string[]>;
}

/**
 * Global exception filter with standardized error codes
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;
    let code: ErrorCode;
    let details: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
        code = STATUS_TO_ERROR_CODE[status] || ERROR_CODES.SERVER_ERROR;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || exception.message;
        error = (responseObj.error as string) || exception.name;
        code = (responseObj.code as ErrorCode) || STATUS_TO_ERROR_CODE[status] || ERROR_CODES.SERVER_ERROR;
        details = responseObj.details as Record<string, string[]> | undefined;
      } else {
        message = exception.message;
        error = exception.name;
        code = STATUS_TO_ERROR_CODE[status] || ERROR_CODES.SERVER_ERROR;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.isProduction ? 'Внутренняя ошибка сервера' : exception.message;
      error = 'InternalServerError';
      code = ERROR_CODES.SERVER_ERROR;

      // Log the actual error for debugging
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        {
          path: request.url,
          method: request.method,
          ip: request.ip,
        }
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Внутренняя ошибка сервера';
      error = 'InternalServerError';
      code = ERROR_CODES.SERVER_ERROR;

      this.logger.error('Unknown error type:', exception);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      code,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include validation details if present
    if (details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }
}

/**
 * Custom exception with error code
 */
export class CodedHttpException extends HttpException {
  constructor(
    message: string,
    code: ErrorCode,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, string[]>
  ) {
    super({ message, code, details }, status);
  }
}

/**
 * Helper to throw coded exceptions
 */
export const throwCodedError = (
  message: string,
  code: ErrorCode,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
  details?: Record<string, string[]>
): never => {
  throw new CodedHttpException(message, code, status, details);
};
