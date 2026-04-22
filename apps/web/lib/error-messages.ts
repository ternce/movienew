/**
 * Error code to Russian message mapping
 * These messages are user-friendly and safe to display
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors (AUTH_0XX)
  AUTH_001: 'Неверный email или пароль',
  AUTH_002: 'Сессия истекла. Войдите снова',
  AUTH_003: 'Недействительный токен авторизации',
  AUTH_004: 'Сессия истекла. Войдите снова',
  AUTH_005: 'Ссылка для сброса пароля истекла',
  AUTH_006: 'Недействительная ссылка для сброса пароля',
  AUTH_007: 'Пользователь с таким email уже существует',
  AUTH_008: 'Требуется авторизация',

  // Validation errors (VAL_0XX)
  VAL_001: 'Проверьте правильность заполнения формы',
  VAL_002: 'Некорректный формат email',
  VAL_003: 'Пароль слишком простой. Используйте буквы, цифры и символы',
  VAL_004: 'Заполните все обязательные поля',

  // Resource errors (RES_0XX)
  RES_001: 'Запрашиваемый ресурс не найден',
  RES_002: 'Конфликт данных. Попробуйте ещё раз',
  RES_003: 'Доступ запрещён',

  // Payment errors (PAY_0XX)
  PAY_001: 'Ошибка при обработке платежа. Попробуйте позже',
  PAY_002: 'Карта отклонена банком',
  PAY_003: 'Недостаточно средств на карте',
  PAY_004: 'Недействительный способ оплаты',
  PAY_005: 'Время оплаты истекло. Попробуйте снова',

  // Subscription errors (SUB_0XX)
  SUB_001: 'Требуется подписка для доступа к контенту',
  SUB_002: 'Срок подписки истёк',
  SUB_003: 'Подписка отменена',
  SUB_004: 'Недействительная подписка',

  // Bonus errors (BON_0XX)
  BON_001: 'Недостаточно бонусов на балансе',
  BON_002: 'Срок действия бонусов истёк',
  BON_003: 'Недействительные бонусы',

  // Age restriction errors (AGE_0XX)
  AGE_001: 'Контент недоступен для вашей возрастной категории',
  AGE_002: 'Требуется подтверждение возраста',
  AGE_003: 'Не удалось подтвердить возраст',

  // Rate limiting errors (RATE_0XX)
  RATE_001: 'Слишком много запросов. Подождите немного',
  RATE_002: 'Превышен лимит запросов. Попробуйте через несколько минут',

  // Partner errors (PART_0XX)
  PART_001: 'Сумма вывода меньше минимальной',
  PART_002: 'Сумма вывода превышает максимальную',
  PART_003: 'Недостаточно средств для вывода',
  PART_004: 'Недействительный партнёрский уровень',

  // Content errors (CONT_0XX)
  CONT_001: 'Контент не найден',
  CONT_002: 'Контент временно недоступен',
  CONT_003: 'Нет доступа к этому контенту',

  // Streaming errors (STRM_0XX)
  STRM_001: 'Ошибка воспроизведения. Попробуйте перезагрузить страницу',
  STRM_002: 'Видео временно недоступно',
  STRM_003: 'Сессия воспроизведения истекла. Обновите страницу',

  // Server errors (SRV_0XX)
  SRV_001: 'Произошла ошибка на сервере. Попробуйте позже',
  SRV_002: 'Сервис временно недоступен',
  SRV_003: 'Превышено время ожидания. Попробуйте снова',

  // Maintenance (MAINT_0XX)
  MAINT_001: 'Ведутся технические работы. Попробуйте позже',

  // Default fallback
  DEFAULT: 'Произошла ошибка. Попробуйте позже',
};

/**
 * Get user-friendly error message by error code
 *
 * @param code - Error code from API (e.g., 'AUTH_001', 'PAY_002')
 * @returns User-friendly message in Russian
 */
export function getErrorMessage(code?: string | null): string {
  if (!code) {
    return ERROR_MESSAGES.DEFAULT;
  }
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT;
}

/**
 * Get error message for API response
 * Handles various response formats
 *
 * @param error - Error object or response from API
 * @returns User-friendly message in Russian
 */
export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Check for error code first (preferred)
    if (err.code && typeof err.code === 'string') {
      const message = getErrorMessage(err.code);
      if (message !== ERROR_MESSAGES.DEFAULT) {
        return message;
      }
    }

    // Fall back to message from response
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }

    // Handle nested error object
    if (err.error && typeof err.error === 'object') {
      const nestedError = err.error as Record<string, unknown>;
      if (nestedError.code && typeof nestedError.code === 'string') {
        return getErrorMessage(nestedError.code);
      }
      if (nestedError.message && typeof nestedError.message === 'string') {
        return nestedError.message;
      }
    }
  }

  return ERROR_MESSAGES.DEFAULT;
}

/**
 * Check if error is an authentication error that requires re-login
 */
export function isAuthError(code?: string | null): boolean {
  if (!code) return false;
  return ['AUTH_002', 'AUTH_003', 'AUTH_004', 'AUTH_008'].includes(code);
}

/**
 * Check if error is a validation error
 */
export function isValidationError(code?: string | null): boolean {
  if (!code) return false;
  return code.startsWith('VAL_');
}

/**
 * Check if error is a rate limiting error
 */
export function isRateLimitError(code?: string | null): boolean {
  if (!code) return false;
  return code.startsWith('RATE_');
}

/**
 * Check if error is a server error (retryable)
 */
export function isServerError(code?: string | null): boolean {
  if (!code) return false;
  return code.startsWith('SRV_') || code.startsWith('MAINT_');
}

/**
 * Check if error is retryable
 */
export function isRetryableError(code?: string | null): boolean {
  return isServerError(code) || isRateLimitError(code);
}

/**
 * Get suggested action for error
 */
export function getErrorAction(code?: string | null): 'retry' | 'login' | 'contact' | 'none' {
  if (!code) return 'none';

  if (isAuthError(code)) {
    return 'login';
  }

  if (isRetryableError(code)) {
    return 'retry';
  }

  // Payment and partner issues may need support
  if (code.startsWith('PAY_') || code.startsWith('PART_')) {
    return 'contact';
  }

  return 'none';
}

/**
 * Error message configuration for forms
 */
export const FORM_ERRORS = {
  required: 'Обязательное поле',
  email: 'Некорректный email',
  minLength: (min: number) => `Минимум ${min} символов`,
  maxLength: (max: number) => `Максимум ${max} символов`,
  password: 'Пароль должен содержать буквы, цифры и символы',
  passwordMatch: 'Пароли не совпадают',
  phone: 'Некорректный номер телефона',
  date: 'Некорректная дата',
  number: 'Введите число',
  positive: 'Число должно быть положительным',
  url: 'Некорректный URL',
};
