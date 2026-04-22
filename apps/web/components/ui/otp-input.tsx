'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  length?: number;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  error = false,
  length = 6,
}: OtpInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, '').split('').slice(0, length);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join('').replace(/\s/g, '');
    onChange(newValue);

    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        handleChange(index, '');
      } else if (index > 0) {
        focusInput(index - 1);
        handleChange(index - 1, '');
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      focusInput(index - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      focusInput(index + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      focusInput(Math.min(pasted.length, length - 1));
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() || ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'w-12 h-14 text-center font-mono text-2xl rounded-lg',
            'bg-mp-surface border border-mp-border text-mp-text-primary',
            'outline-none transition-colors',
            'focus:border-mp-accent-primary focus:ring-1 focus:ring-mp-accent-primary/30',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
          )}
          aria-label={`Цифра ${i + 1}`}
        />
      ))}
    </div>
  );
}
