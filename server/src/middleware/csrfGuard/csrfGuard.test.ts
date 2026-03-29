import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

function createApp() {
  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => 'test-csrf-secret',
    getSessionIdentifier: (req) => req.cookies?.sid ?? '',
    cookieName: '__csrf',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
    },
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ token });
  });

  app.use(doubleCsrfProtection);

  app.post('/test', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('CSRF protection', () => {
  it('rejects POST without CSRF token', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/test')
      .send({ data: 'hello' });

    expect(res.status).toBe(403);
  });

  it('allows POST with valid CSRF token', async () => {
    const app = createApp();

    // 1. Get CSRF token (sets __csrf cookie)
    const tokenRes = await request(app).get('/api/csrf-token');
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.token).toBeDefined();

    const csrfToken = tokenRes.body.token as string;

    // Extract cookies from the response
    const cookies = (tokenRes.headers['set-cookie'] as string[]) ?? [];
    const cookieHeader = cookies.map((c: string) => c.split(';')[0]).join('; ');

    // 2. POST with the token and cookie
    const postRes = await request(app)
      .post('/test')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken)
      .send({ data: 'hello' });

    expect(postRes.status).toBe(200);
    expect(postRes.body).toEqual({ ok: true });
  });

  it('returns a token from GET /api/csrf-token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/csrf-token');

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });
});
