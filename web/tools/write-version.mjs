import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Compile the release version into the bundle, including offline/PWA usage.
const version = readFileSync(new URL('../../VERSION', import.meta.url), 'utf8').trim();
if (!version) throw new Error('VERSION must contain the FleetLog release version');
const output = new URL('../src/app/generated/version.ts', import.meta.url);
mkdirSync(new URL('.', output), { recursive: true });
writeFileSync(
  output,
  `// Generated from VERSION by tools/write-version.mjs.\nexport const appVersion = ${JSON.stringify(version)};\n`,
);
