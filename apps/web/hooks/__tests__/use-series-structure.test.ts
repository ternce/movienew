import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('series structure messages', () => {
  it('keeps season-management toasts as valid UTF-8 Russian text', () => {
    const source = readFileSync(
      join(process.cwd(), 'hooks/use-series-structure.ts'),
      'utf8',
    );

    expect(source).toContain("toast.success('Сезон добавлен')");
    expect(source).toContain("toast.error(error.message || 'Не удалось добавить сезон')");
    expect(source).not.toContain('\u0420\u00a0\u0420\u040e\u0420\u00a0\u0412\u00b5\u0420\u00a0\u0412\u00b7\u0420\u00a0\u0421\u2022\u0420\u00a0\u0420\u2026 \u0420\u00a0\u0422\u2018\u0420\u00a0\u0421\u2022\u0420\u00a0\u0412\u00b1\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0420\u2020\u0420\u00a0\u0412\u00bb\u0420\u00a0\u0412\u00b5\u0420\u00a0\u0420\u2026');
    expect(source).not.toContain('\u0420\u00a0\u0421\u045a\u0420\u00a0\u0412\u00b5 \u0421\u040b\u0421\u201c\u0420\u00a0\u0422\u2018\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0412\u00bb\u0420\u00a0\u0421\u2022\u0421\u0403\u0420\u0403\u0421\u040a \u0420\u00a0\u0422\u2018\u0420\u00a0\u0421\u2022\u0420\u00a0\u0412\u00b1\u0420\u00a0\u0412\u00b0\u0420\u00a0\u0420\u2020\u0420\u00a0\u0421\u2018\u0421\u0459\u0421\u201a\u0421\u040a \u0421\u0403\u0420\u00a0\u0412\u00b5\u0420\u00a0\u0412\u00b7\u0420\u00a0\u0421\u2022\u0420\u00a0\u0420\u2026');
    expect(source).not.toContain('????');
  });
});
