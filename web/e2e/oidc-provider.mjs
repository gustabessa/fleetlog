import { createServer } from 'node:http';
import { generateKeyPairSync, randomBytes, createHash, sign } from 'node:crypto';
export async function oidcFixture() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = { ...publicKey.export({ format: 'jwk' }), kid: 'e2e', use: 'sig', alg: 'RS256' };
  const codes = new Map();
  let issuer = '';
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, issuer);
    const json = (status, value) =>
      response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));
    if (url.pathname === '/.well-known/openid-configuration')
      return json(200, {
        issuer,
        authorization_endpoint: issuer + '/authorize',
        token_endpoint: issuer + '/token',
        jwks_uri: issuer + '/keys',
        id_token_signing_alg_values_supported: ['RS256'],
      });
    if (url.pathname === '/keys') return json(200, { keys: [key] });
    if (url.pathname === '/authorize') {
      const q = url.searchParams;
      if (
        q.get('client_id') !== 'e2e-client' ||
        q.get('redirect_uri') !== 'http://127.0.0.1:4173/api/auth/oidc/callback' ||
        q.get('code_challenge_method') !== 'S256'
      )
        return json(400, { error: 'invalid_request' });
      const code = randomBytes(16).toString('hex');
      codes.set(code, { nonce: q.get('nonce'), challenge: q.get('code_challenge'), subject: q.get('fixture_subject') ?? 'e2e-subject' });
      return response
        .writeHead(302, {
          Location:
            q.get('redirect_uri') +
            '?state=' +
            encodeURIComponent(q.get('state')) +
            '&code=' +
            code,
        })
        .end();
    }
    if (url.pathname === '/token') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const q = new URLSearchParams(Buffer.concat(chunks).toString());
      const code = codes.get(q.get('code'));
      codes.delete(q.get('code'));
      const expected = 'Basic ' + Buffer.from('e2e-client:e2e-oidc-secret').toString('base64');
      if (
        request.headers.authorization !== expected ||
        !code ||
        createHash('sha256')
          .update(q.get('code_verifier') ?? '')
          .digest('base64url') !== code.challenge
      )
        return json(400, { error: 'invalid_grant' });
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'e2e', typ: 'JWT' })).toString(
        'base64url',
      );
      const now = Math.floor(Date.now() / 1000);
      const payload = Buffer.from(
        JSON.stringify({
          iss: issuer,
          sub: code.subject,
          aud: 'e2e-client',
          iat: now,
          exp: now + 3600,
          nonce: code.nonce,
        }),
      ).toString('base64url');
      const data = header + '.' + payload;
      const signature = sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url');
      return json(200, {
        access_token: 'fixture',
        token_type: 'Bearer',
        id_token: data + '.' + signature,
      });
    }
    json(404, { error: 'not_found' });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  issuer = `http://127.0.0.1:${server.address().port}`;
  return { issuer, close: () => server.close() };
}
