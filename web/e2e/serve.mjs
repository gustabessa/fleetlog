import { createServer } from 'node:http';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

if (!process.env.E2E_DATABASE_URL)
  throw new Error('Set E2E_DATABASE_URL to a disposable PostgreSQL database');

// Serve an isolated copy so deployment tests never mutate the production build.
const temporary = mkdtempSync(resolve(tmpdir(), 'fleetlog-e2e-'));
const assets = resolve('.e2e-dist');
const binary = resolve(temporary, 'fleetlog');
rmSync(assets, { recursive: true, force: true });
cpSync('dist/fleetlog/browser', assets, { recursive: true });
execFileSync(process.env.GO_BIN || 'go', ['build', '-o', binary, './cmd/fleetlog'], {
  cwd: resolve('..'),
  stdio: 'inherit',
});
// Disposable S3 protocol fixture: real Go SDK requests, volatile objects only.
const objects = new Map();
const s3 = createServer(async (request, response) => {
  if (!request.headers.authorization?.startsWith('AWS4-HMAC-SHA256')) {
    response.writeHead(403).end();
    return;
  }
  const key = request.url.split('?')[0];
  if (request.method === 'PUT') {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    objects.set(key, Buffer.concat(chunks));
    response.writeHead(200).end();
  } else if (request.method === 'GET') {
    const object = objects.get(key);
    if (!object) response.writeHead(404).end();
    else response.writeHead(200).end(object);
  } else if (request.method === 'DELETE') {
    objects.delete(key);
    response.writeHead(204).end();
  } else response.writeHead(405).end();
});
await new Promise((resolve) => s3.listen(0, '127.0.0.1', resolve));
const server = spawn(binary, [], {
  env: {
    ...process.env,
    HTTP_ADDR: '127.0.0.1:4173',
    STATIC_DIR: assets,
    DATABASE_URL: process.env.E2E_DATABASE_URL,
    PUBLIC_URL: 'http://127.0.0.1:4173',
    S3_ENDPOINT: `http://127.0.0.1:${s3.address().port}`,
    S3_BUCKET: 'e2e-private',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY_ID: 'e2e-key',
    S3_SECRET_ACCESS_KEY: 'e2e-secret',
    S3_PATH_STYLE: 'true',
    BOOTSTRAP_USERNAME: 'e2e',
    BOOTSTRAP_PASSWORD: 'e2e-password-12345',
  },
  stdio: 'inherit',
});
const cleanup = () => {
  s3.close();
  rmSync(temporary, { recursive: true, force: true });
  rmSync(assets, { recursive: true, force: true });
};
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('error', (error) => {
  console.error(error);
  cleanup();
  process.exit(1);
});
server.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 1);
});
