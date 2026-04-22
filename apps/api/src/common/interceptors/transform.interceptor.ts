import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

function stringifyBigIntDeep(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === null || value === undefined) {
    return value;
  }

  // Preserve common non-plain types (they either serialize fine or are handled elsewhere)
  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => stringifyBigIntDeep(v, seen));
  }

  if (typeof value === 'object') {
    // Only traverse plain objects; preserve class instances (e.g., Prisma.Decimal)
    const proto = Object.getPrototypeOf(value);
    const isPlainObject = proto === Object.prototype || proto === null;
    if (!isPlainObject) {
      return value;
    }

    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return obj;
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = stringifyBigIntDeep(v, seen);
    }
    return out;
  }

  return value;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: stringifyBigIntDeep(data) as T,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
