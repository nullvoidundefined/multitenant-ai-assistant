import cors from 'cors';

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

function isAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  // Allow Vercel preview/deployment URLs for the same project
  if (/^https:\/\/multitenant-ai-assistant[^.]*\.vercel\.app$/.test(origin))
    return true;
  return false;
}

export const corsConfig = cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || isAllowed(origin)) {
      callback(null, origin ?? false);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 7200,
});
