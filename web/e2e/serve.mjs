import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

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
const server = spawn(binary, [], {
  env: { ...process.env, HTTP_ADDR: '127.0.0.1:4173', STATIC_DIR: assets },
  stdio: 'inherit',
});
const cleanup = () => {
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
