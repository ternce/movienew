import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }
    return value;
  }

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? this.sanitizeString(item) :
          typeof item === 'object' && item !== null ? this.sanitizeObject(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}
