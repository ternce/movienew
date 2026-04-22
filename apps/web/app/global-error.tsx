'use client';

import { useEffect } from 'react';

/**
 * Root-level error boundary that catches errors in the root layout.
 * Must include <html> and <body> tags since it replaces the entire page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ru" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#05060A',
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#F5F7FF',
          padding: '1rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          {/* Error icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#35141A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF9AA8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '16px',
              lineHeight: 1.3,
            }}
          >
            Критическая ошибка
          </h1>

          <p
            style={{
              color: '#9CA2BC',
              fontSize: '1rem',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            Произошла критическая ошибка приложения. Мы уже работаем над её
            устранением. Попробуйте обновить страницу.
          </p>

          {/* Error digest for tracking */}
          {error.digest && (
            <p
              style={{
                color: '#5A6072',
                fontSize: '0.75rem',
                marginBottom: '24px',
                fontFamily: 'monospace',
              }}
            >
              Код ошибки: {error.digest}
            </p>
          )}

          {/* Dev-only error details */}
          {process.env.NODE_ENV === 'development' && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#10131C',
                border: '1px solid #272B38',
                textAlign: 'left',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  color: '#FF9AA8',
                  wordBreak: 'break-all',
                  margin: 0,
                }}
              >
                {error.message}
              </p>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #C94BFF 0%, #28E0C4 100%)',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                width: 'fit-content',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Попробовать снова
            </button>

            <a
              href="/"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid #272B38',
                backgroundColor: 'transparent',
                color: '#F5F7FF',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              На главную
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
