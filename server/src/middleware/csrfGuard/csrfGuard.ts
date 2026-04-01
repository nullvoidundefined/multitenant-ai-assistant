import { isProduction } from 'app/config/env.js';
import { doubleCsrf } from 'csrf-csrf';

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET ?? 'dev-csrf-secret-change-me',
  getSessionIdentifier: (req) => req.cookies?.sid ?? '',
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: isProduction() ? 'none' : 'strict',
    secure: isProduction(),
  },
});

export { doubleCsrfProtection as csrfGuard, generateCsrfToken };
