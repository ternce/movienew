import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const roots = [
  'app/(main)/watch-party',
  'hooks/use-watch-party-socket.ts',
  'components/chat',
];

const checkedExtensions = new Set(['.ts', '.tsx', '.css', '.json']);
const mojibakeMarkers = [
  '\u0420\u040e',
  '\u0420\u040b',
  '\u0420\u0401',
  '\u0420\u0459',
  '\u0420\u2026',
  '\u0420\u00a0',
  '\u0420\u0458',
  '\u0420\u00b0',
  '\u0420\u00b5',
  '\u0420\u00bd',
  '\u0420\u0456',
  '\u0420\u0406',
  '\u0420\u0452',
  '\u0420\u045f',
  '\u0420\u0491',
  '\u0420\u201c',
  '\u0420\u0402',
  '\u0420\u0409',
  '\u0421\u0403',
  '\u0421\u201a',
  '\u0421\u0402',
  '\u0421\u2039',
  '\u0421\u040e',
  '\u0421\u201c',
  '\u0421\u0409',
  '\u0432\u0402',
  '\u00d0',
  '\u00d1',
  '\u043f\u0457\u0405',
  '\uFFFD',
];

function collectFiles(relativePath: string): string[] {
  const absolutePath = join(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) return [];

  const stat = statSync(absolutePath);
  if (stat.isFile()) return checkedExtensions.has(extname(absolutePath)) ? [absolutePath] : [];

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) =>
    collectFiles(join(relativePath, entry.name)),
  );
}

describe('Watch Party source encoding', () => {
  it('does not contain Russian mojibake sequences', () => {
    const failures = roots
      .flatMap(collectFiles)
      .flatMap((file) => {
        const lines = readFileSync(file, 'utf8').split(/\r?\n/);
        return lines
          .map((line, index) => ({ file, line, lineNumber: index + 1 }))
          .filter(({ line }) => mojibakeMarkers.some((marker) => line.includes(marker)));
      });

    expect(failures).toEqual([]);
  });
});
