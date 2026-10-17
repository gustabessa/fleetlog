import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const output = new URL('../public/docs/api/', import.meta.url);
mkdirSync(output, { recursive: true });
const spec = JSON.parse(readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8'));
spec.info.version = readFileSync(new URL('../../VERSION', import.meta.url), 'utf8').trim();
writeFileSync(new URL('openapi.json', output), JSON.stringify(spec, null, 2) + '\n');
copyFileSync(
  new URL('../node_modules/@scalar/api-reference/dist/browser/standalone.js', import.meta.url),
  new URL('scalar.js', output),
);
