import { describe, it, expect } from 'vitest';
import {
  ERROR_MESSAGES,
  getErrorMessage,
  getApiErrorMessage,
  isAuthError,
  isValidationError,
  isRateLimitError,
  isServerError,
  isRetryableError,
  getErrorAction,
  FORM_ERRORS,
} from '../error-messages';

describe('ERROR_MESSAGES', () => {
  describe('Authentication errors (AUTH_0XX)', () => {
    it('should have AUTH_001 message', () => {
      expect(ERROR_MESSAGES.AUTH_001).toBe('Неверный email или пароль');
    });

    it('should have AUTH_002 message', () => {
      expect(ERROR_MESSAGES.AUTH_002).toBe('Сессия истекла. Войдите снова');
    });

    it('should have AUTH_003 message', () => {
      expect(ERROR_MESSAGES.AUTH_003).toBe('Недействительный токен авторизации');
    });

    it('should have AUTH_004 message', () => {
      expect(ERROR_MESSAGES.AUTH_004).toBe('Сессия истекла. Войдите снова');
    });

    it('should have AUTH_005 message', () => {
      expect(ERROR_MESSAGES.AUTH_005).toBe('Ссылка для сброса пароля истекла');
    });

    it('should have AUTH_006 message', () => {
      expect(ERROR_MESSAGES.AUTH_006).toBe('Недействительная ссылка для сброса пароля');
    });

    it('should have AUTH_007 message', () => {
      expect(ERROR_MESSAGES.AUTH_007).toBe('Пользователь с таким email уже существует');
    });

    it('should have AUTH_008 message', () => {
      expect(ERROR_MESSAGES.AUTH_008).toBe('Требуется авторизация');
    });
  });

  describe('Validation errors (VAL_0XX)', () => {
    it('should have VAL_001 message', () => {
      expect(ERROR_MESSAGES.VAL_001).toBe('Проверьте правильность заполнения формы');
    });

    it('should have VAL_002 message', () => {
      expect(ERROR_MESSAGES.VAL_002).toBe('Некорректный формат email');
    });

    it('should have VAL_003 message', () => {
      expect(ERROR_MESSAGES.VAL_003).toBe('Пароль слишком простой. Используйте буквы, цифры и символы');
    });

    it('should have VAL_004 message', () => {
      expect(ERROR_MESSAGES.VAL_004).toBe('Заполните все обязательные поля');
    });
  });

  describe('Resource errors (RES_0XX)', () => {
    it('should have RES_001 message', () => {
      expect(ERROR_MESSAGES.RES_001).toBe('Запрашиваемый ресурс не найден');
    });

    it('should have RES_002 message', () => {
      expect(ERROR_MESSAGES.RES_002).toBe('Конфликт данных. Попробуйте ещё раз');
    });

    it('should have RES_003 message', () => {
      expect(ERROR_MESSAGES.RES_003).toBe('Доступ запрещён');
    });
  });

  describe('Payment errors (PAY_0XX)', () => {
    it('should have PAY_001 message', () => {
      expect(ERROR_MESSAGES.PAY_001).toBe('Ошибка при обработке платежа. Попробуйте позже');
    });

    it('should have PAY_002 message', () => {
      expect(ERROR_MESSAGES.PAY_002).toBe('Карта отклонена банком');
    });

    it('should have PAY_003 message', () => {
      expect(ERROR_MESSAGES.PAY_003).toBe('Недостаточно средств на карте');
    });

    it('should have PAY_004 message', () => {
      expect(ERROR_MESSAGES.PAY_004).toBe('Недействительный способ оплаты');
    });

    it('should have PAY_005 message', () => {
      expect(ERROR_MESSAGES.PAY_005).toBe('Время оплаты истекло. Попробуйте снова');
    });
  });

  describe('Subscription errors (SUB_0XX)', () => {
    it('should have SUB_001 message', () => {
      expect(ERROR_MESSAGES.SUB_001).toBe('Требуется подписка для доступа к контенту');
    });

    it('should have SUB_002 message', () => {
      expect(ERROR_MESSAGES.SUB_002).toBe('Срок подписки истёк');
    });

    it('should have SUB_003 message', () => {
      expect(ERROR_MESSAGES.SUB_003).toBe('Подписка отменена');
    });

    it('should have SUB_004 message', () => {
      expect(ERROR_MESSAGES.SUB_004).toBe('Недействительная подписка');
    });
  });

  describe('Bonus errors (BON_0XX)', () => {
    it('should have BON_001 message', () => {
      expect(ERROR_MESSAGES.BON_001).toBe('Недостаточно бонусов на балансе');
    });

    it('should have BON_002 message', () => {
      expect(ERROR_MESSAGES.BON_002).toBe('Срок действия бонусов истёк');
    });

    it('should have BON_003 message', () => {
      expect(ERROR_MESSAGES.BON_003).toBe('Недействительные бонусы');
    });
  });

  describe('Age restriction errors (AGE_0XX)', () => {
    it('should have AGE_001 message', () => {
      expect(ERROR_MESSAGES.AGE_001).toBe('Контент недоступен для вашей возрастной категории');
    });

    it('should have AGE_002 message', () => {
      expect(ERROR_MESSAGES.AGE_002).toBe('Требуется подтверждение возраста');
    });

    it('should have AGE_003 message', () => {
      expect(ERROR_MESSAGES.AGE_003).toBe('Не удалось подтвердить возраст');
    });
  });

  describe('Rate limiting errors (RATE_0XX)', () => {
    it('should have RATE_001 message', () => {
      expect(ERROR_MESSAGES.RATE_001).toBe('Слишком много запросов. Подождите немного');
    });

    it('should have RATE_002 message', () => {
      expect(ERROR_MESSAGES.RATE_002).toBe('Превышен лимит запросов. Попробуйте через несколько минут');
    });
  });

  describe('Partner errors (PART_0XX)', () => {
    it('should have PART_001 message', () => {
      expect(ERROR_MESSAGES.PART_001).toBe('Сумма вывода меньше минимальной');
    });

    it('should have PART_002 message', () => {
      expect(ERROR_MESSAGES.PART_002).toBe('Сумма вывода превышает максимальную');
    });

    it('should have PART_003 message', () => {
      expect(ERROR_MESSAGES.PART_003).toBe('Недостаточно средств для вывода');
    });

    it('should have PART_004 message', () => {
      expect(ERROR_MESSAGES.PART_004).toBe('Недействительный партнёрский уровень');
    });
  });

  describe('Content errors (CONT_0XX)', () => {
    it('should have CONT_001 message', () => {
      expect(ERROR_MESSAGES.CONT_001).toBe('Контент не найден');
    });

    it('should have CONT_002 message', () => {
      expect(ERROR_MESSAGES.CONT_002).toBe('Контент временно недоступен');
    });

    it('should have CONT_003 message', () => {
      expect(ERROR_MESSAGES.CONT_003).toBe('Нет доступа к этому контенту');
    });
  });

  describe('Streaming errors (STRM_0XX)', () => {
    it('should have STRM_001 message', () => {
      expect(ERROR_MESSAGES.STRM_001).toBe('Ошибка воспроизведения. Попробуйте перезагрузить страницу');
    });

    it('should have STRM_002 message', () => {
      expect(ERROR_MESSAGES.STRM_002).toBe('Видео временно недоступно');
    });

    it('should have STRM_003 message', () => {
      expect(ERROR_MESSAGES.STRM_003).toBe('Сессия воспроизведения истекла. Обновите страницу');
    });
  });

  describe('Server errors (SRV_0XX)', () => {
    it('should have SRV_001 message', () => {
      expect(ERROR_MESSAGES.SRV_001).toBe('Произошла ошибка на сервере. Попробуйте позже');
    });

    it('should have SRV_002 message', () => {
      expect(ERROR_MESSAGES.SRV_002).toBe('Сервис временно недоступен');
    });

    it('should have SRV_003 message', () => {
      expect(ERROR_MESSAGES.SRV_003).toBe('Превышено время ожидания. Попробуйте снова');
    });
  });

  describe('Maintenance errors (MAINT_0XX)', () => {
    it('should have MAINT_001 message', () => {
      expect(ERROR_MESSAGES.MAINT_001).toBe('Ведутся технические работы. Попробуйте позже');
    });
  });

  describe('Default fallback', () => {
    it('should have DEFAULT message', () => {
      expect(ERROR_MESSAGES.DEFAULT).toBe('Произошла ошибка. Попробуйте позже');
    });
  });
});

describe('getErrorMessage()', () => {
  it('should return message for valid code', () => {
    expect(getErrorMessage('AUTH_001')).toBe('Неверный email или пароль');
  });

  it('should return message for all error codes', () => {
    const codes = [
      'AUTH_001', 'AUTH_002', 'AUTH_003', 'AUTH_004', 'AUTH_005', 'AUTH_006', 'AUTH_007', 'AUTH_008',
      'VAL_001', 'VAL_002', 'VAL_003', 'VAL_004',
      'RES_001', 'RES_002', 'RES_003',
      'PAY_001', 'PAY_002', 'PAY_003', 'PAY_004', 'PAY_005',
      'SUB_001', 'SUB_002', 'SUB_003', 'SUB_004',
      'BON_001', 'BON_002', 'BON_003',
      'AGE_001', 'AGE_002', 'AGE_003',
      'RATE_001', 'RATE_002',
      'PART_001', 'PART_002', 'PART_003', 'PART_004',
      'CONT_001', 'CONT_002', 'CONT_003',
      'STRM_001', 'STRM_002', 'STRM_003',
      'SRV_001', 'SRV_002', 'SRV_003',
      'MAINT_001',
    ];

    codes.forEach((code) => {
      const message = getErrorMessage(code);
      expect(message).not.toBe(ERROR_MESSAGES.DEFAULT);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  it('should return DEFAULT for unknown code', () => {
    expect(getErrorMessage('UNKNOWN_999')).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should return DEFAULT for null', () => {
    expect(getErrorMessage(null)).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should return DEFAULT for undefined', () => {
    expect(getErrorMessage(undefined)).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should return DEFAULT for empty string', () => {
    expect(getErrorMessage('')).toBe(ERROR_MESSAGES.DEFAULT);
  });
});

describe('getApiErrorMessage()', () => {
  it('should return string error as-is', () => {
    expect(getApiErrorMessage('Direct error message')).toBe('Direct error message');
  });

  it('should extract code from object with code property', () => {
    expect(getApiErrorMessage({ code: 'AUTH_001' })).toBe('Неверный email или пароль');
  });

  it('should use message if code is unknown', () => {
    expect(getApiErrorMessage({ code: 'UNKNOWN_999', message: 'Custom message' })).toBe('Custom message');
  });

  it('should fall back to message when no code', () => {
    expect(getApiErrorMessage({ message: 'Error from server' })).toBe('Error from server');
  });

  it('should extract code from nested error object', () => {
    expect(getApiErrorMessage({
      error: { code: 'VAL_001' }
    })).toBe('Проверьте правильность заполнения формы');
  });

  it('should extract message from nested error object', () => {
    expect(getApiErrorMessage({
      error: { message: 'Nested error message' }
    })).toBe('Nested error message');
  });

  it('should return DEFAULT for unknown object format', () => {
    expect(getApiErrorMessage({ foo: 'bar' })).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should return DEFAULT for null', () => {
    expect(getApiErrorMessage(null)).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should return DEFAULT for undefined', () => {
    expect(getApiErrorMessage(undefined)).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should return DEFAULT for number', () => {
    expect(getApiErrorMessage(123)).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should return DEFAULT for array', () => {
    expect(getApiErrorMessage(['error'])).toBe(ERROR_MESSAGES.DEFAULT);
  });

  it('should prioritize code over message', () => {
    expect(getApiErrorMessage({
      code: 'AUTH_002',
      message: 'Custom message'
    })).toBe('Сессия истекла. Войдите снова');
  });
});

describe('isAuthError()', () => {
  it('should return true for AUTH_002', () => {
    expect(isAuthError('AUTH_002')).toBe(true);
  });

  it('should return true for AUTH_003', () => {
    expect(isAuthError('AUTH_003')).toBe(true);
  });

  it('should return true for AUTH_004', () => {
    expect(isAuthError('AUTH_004')).toBe(true);
  });

  it('should return true for AUTH_008', () => {
    expect(isAuthError('AUTH_008')).toBe(true);
  });

  it('should return false for AUTH_001 (invalid credentials, not auth error)', () => {
    expect(isAuthError('AUTH_001')).toBe(false);
  });

  it('should return false for AUTH_007 (user exists, not auth error)', () => {
    expect(isAuthError('AUTH_007')).toBe(false);
  });

  it('should return false for non-auth codes', () => {
    expect(isAuthError('VAL_001')).toBe(false);
    expect(isAuthError('PAY_001')).toBe(false);
    expect(isAuthError('SRV_001')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isAuthError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isAuthError(undefined)).toBe(false);
  });
});

describe('isValidationError()', () => {
  it('should return true for VAL_ prefix codes', () => {
    expect(isValidationError('VAL_001')).toBe(true);
    expect(isValidationError('VAL_002')).toBe(true);
    expect(isValidationError('VAL_003')).toBe(true);
    expect(isValidationError('VAL_004')).toBe(true);
  });

  it('should return false for non-VAL codes', () => {
    expect(isValidationError('AUTH_001')).toBe(false);
    expect(isValidationError('PAY_001')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidationError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidationError(undefined)).toBe(false);
  });
});

describe('isRateLimitError()', () => {
  it('should return true for RATE_ prefix codes', () => {
    expect(isRateLimitError('RATE_001')).toBe(true);
    expect(isRateLimitError('RATE_002')).toBe(true);
  });

  it('should return false for non-RATE codes', () => {
    expect(isRateLimitError('AUTH_001')).toBe(false);
    expect(isRateLimitError('SRV_001')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isRateLimitError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isRateLimitError(undefined)).toBe(false);
  });
});

describe('isServerError()', () => {
  it('should return true for SRV_ prefix codes', () => {
    expect(isServerError('SRV_001')).toBe(true);
    expect(isServerError('SRV_002')).toBe(true);
    expect(isServerError('SRV_003')).toBe(true);
  });

  it('should return true for MAINT_ prefix codes', () => {
    expect(isServerError('MAINT_001')).toBe(true);
  });

  it('should return false for non-server codes', () => {
    expect(isServerError('AUTH_001')).toBe(false);
    expect(isServerError('VAL_001')).toBe(false);
    expect(isServerError('RATE_001')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isServerError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isServerError(undefined)).toBe(false);
  });
});

describe('isRetryableError()', () => {
  it('should return true for server errors', () => {
    expect(isRetryableError('SRV_001')).toBe(true);
    expect(isRetryableError('SRV_002')).toBe(true);
    expect(isRetryableError('SRV_003')).toBe(true);
    expect(isRetryableError('MAINT_001')).toBe(true);
  });

  it('should return true for rate limit errors', () => {
    expect(isRetryableError('RATE_001')).toBe(true);
    expect(isRetryableError('RATE_002')).toBe(true);
  });

  it('should return false for non-retryable errors', () => {
    expect(isRetryableError('AUTH_001')).toBe(false);
    expect(isRetryableError('VAL_001')).toBe(false);
    expect(isRetryableError('PAY_001')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isRetryableError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe('getErrorAction()', () => {
  describe('login action', () => {
    it('should return login for AUTH_002', () => {
      expect(getErrorAction('AUTH_002')).toBe('login');
    });

    it('should return login for AUTH_003', () => {
      expect(getErrorAction('AUTH_003')).toBe('login');
    });

    it('should return login for AUTH_004', () => {
      expect(getErrorAction('AUTH_004')).toBe('login');
    });

    it('should return login for AUTH_008', () => {
      expect(getErrorAction('AUTH_008')).toBe('login');
    });
  });

  describe('retry action', () => {
    it('should return retry for server errors', () => {
      expect(getErrorAction('SRV_001')).toBe('retry');
      expect(getErrorAction('SRV_002')).toBe('retry');
      expect(getErrorAction('SRV_003')).toBe('retry');
    });

    it('should return retry for rate limit errors', () => {
      expect(getErrorAction('RATE_001')).toBe('retry');
      expect(getErrorAction('RATE_002')).toBe('retry');
    });

    it('should return retry for maintenance', () => {
      expect(getErrorAction('MAINT_001')).toBe('retry');
    });
  });

  describe('contact action', () => {
    it('should return contact for payment errors', () => {
      expect(getErrorAction('PAY_001')).toBe('contact');
      expect(getErrorAction('PAY_002')).toBe('contact');
      expect(getErrorAction('PAY_003')).toBe('contact');
      expect(getErrorAction('PAY_004')).toBe('contact');
      expect(getErrorAction('PAY_005')).toBe('contact');
    });

    it('should return contact for partner errors', () => {
      expect(getErrorAction('PART_001')).toBe('contact');
      expect(getErrorAction('PART_002')).toBe('contact');
      expect(getErrorAction('PART_003')).toBe('contact');
      expect(getErrorAction('PART_004')).toBe('contact');
    });
  });

  describe('none action', () => {
    it('should return none for validation errors', () => {
      expect(getErrorAction('VAL_001')).toBe('none');
      expect(getErrorAction('VAL_002')).toBe('none');
    });

    it('should return none for AUTH_001 (invalid credentials)', () => {
      expect(getErrorAction('AUTH_001')).toBe('none');
    });

    it('should return none for subscription errors', () => {
      expect(getErrorAction('SUB_001')).toBe('none');
    });

    it('should return none for null', () => {
      expect(getErrorAction(null)).toBe('none');
    });

    it('should return none for undefined', () => {
      expect(getErrorAction(undefined)).toBe('none');
    });
  });
});

describe('FORM_ERRORS', () => {
  it('should have required error in Russian', () => {
    expect(FORM_ERRORS.required).toBe('Обязательное поле');
  });

  it('should have email error in Russian', () => {
    expect(FORM_ERRORS.email).toBe('Некорректный email');
  });

  it('should generate minLength error with number', () => {
    expect(FORM_ERRORS.minLength(8)).toBe('Минимум 8 символов');
    expect(FORM_ERRORS.minLength(3)).toBe('Минимум 3 символов');
  });

  it('should generate maxLength error with number', () => {
    expect(FORM_ERRORS.maxLength(100)).toBe('Максимум 100 символов');
    expect(FORM_ERRORS.maxLength(255)).toBe('Максимум 255 символов');
  });

  it('should have password error in Russian', () => {
    expect(FORM_ERRORS.password).toBe('Пароль должен содержать буквы, цифры и символы');
  });

  it('should have passwordMatch error in Russian', () => {
    expect(FORM_ERRORS.passwordMatch).toBe('Пароли не совпадают');
  });

  it('should have phone error in Russian', () => {
    expect(FORM_ERRORS.phone).toBe('Некорректный номер телефона');
  });

  it('should have date error in Russian', () => {
    expect(FORM_ERRORS.date).toBe('Некорректная дата');
  });

  it('should have number error in Russian', () => {
    expect(FORM_ERRORS.number).toBe('Введите число');
  });

  it('should have positive error in Russian', () => {
    expect(FORM_ERRORS.positive).toBe('Число должно быть положительным');
  });

  it('should have url error in Russian', () => {
    expect(FORM_ERRORS.url).toBe('Некорректный URL');
  });
});
