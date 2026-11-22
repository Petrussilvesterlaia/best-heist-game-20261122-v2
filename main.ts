// main.ts — Velvet Vault's hand-in program for make.fun.
//
// It copies game/ and screenshots/ from this repository into the output
// directory (MAKEFUN_OUTPUT_DIR outside the grader, /output inside it)
// and writes dossier.json there with the kit's vendored buildDossier, so
// the dossier the gate rebuilds is byte for byte the one submitted.
//
// The screenshots are the entry's cover and proof, so the program refuses
// to hand in a night it cannot show: fewer than 3 or more than 4 images
// in screenshots/ is a hard stop, not a warning.

import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps this bounty grades under (see the kit's RULES.txt, "The gate").
const CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function screenshotNames(): string[] {
  const dir = join(repoRoot, 'screenshots');
  if (!existsSync(dir)) fail('screenshots/ is missing — an entry hands in 3 or 4 renders of its game');
  return readdirSync(dir)
    .filter((name) => /\.(png|jpe?g)$/i.test(name) && !name.startsWith('.'))
    .sort();
}

function main(): void {
  const shots = screenshotNames();
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    fail(`screenshots/ holds ${shots.length} image(s); the hand-in needs 3 or 4 — stopping at the dossier gate`);
  }

  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  verifyHandIn(outDir, dossier);

  console.log(`main.ts: handed in game/ + ${shots.length} screenshots (${shots.join(', ')})`);
  console.log(`main.ts: dossier.json written, ${dossier.byteLength} bytes`);
}

// The grader runs this program twice and demands the same bytes both
// times, so prove it before leaving: rebuild the dossier from the output
// directory as it now stands and compare it with the file just written,
// byte for byte. A mismatch means the copy step is not deterministic.
function verifyHandIn(outDir: string, written: Uint8Array): void {
  const rebuilt = buildDossier(outDir, CAPS);
  const onDisk = readFileSync(join(outDir, 'dossier.json'));
  if (rebuilt.byteLength !== written.byteLength || !rebuilt.every((b, i) => b === written[i])) {
    fail('verification failed: a second buildDossier over the output differs from the first');
  }
  if (!onDisk.equals(Buffer.from(written))) {
    fail('verification failed: dossier.json on disk differs from the bytes built in memory');
  }
}

main();
