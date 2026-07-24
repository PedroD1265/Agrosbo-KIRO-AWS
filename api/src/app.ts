import express, { Router } from 'express';
import path from 'node:path';
import { env } from './env.js';
import { requestLogger } from './logger.js';
import { registerRoutes } from './routes.js';
import { registerHealthRoutes } from './health.js';
import { UPLOADS_DIR } from './attachments.js';
import { attachUser } from './auth.js';

export const app = express();
app.use(express.json({ limit: '15mb' }));
app.use('/api', requestLogger());
app.use('/api', attachUser());

// Global auth guard. When AUTH_ENFORCEMENT=off, this no-ops. When 'on',
// only the whitelisted public paths bypass; everything else needs req.user.
const AUTH_PUBLIC = new Set([
  '/health/live',
  '/health/ready',
  '/crops',
  '/auth/login',
  '/auth/me',
  '/auth/logout',
]);

app.use('/api', (req, res, next) => {
  if (env.authEnforcement === 'off') return next();
  if (AUTH_PUBLIC.has(req.path)) return next();
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  next();
});

app.use(
  '/uploads',
  express.static(path.resolve(UPLOADS_DIR), {
    index: false,
    maxAge: '1h',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

const apiRouter = Router();
registerHealthRoutes(apiRouter);
registerRoutes(apiRouter);
app.use('/api', apiRouter);
