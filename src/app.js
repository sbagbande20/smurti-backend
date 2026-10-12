import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { requireApiToken } from './middleware/auth.js';
import { createHealthRouter } from './routes/health.js';

export function createApp(dependencies = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '256kb' }));

  app.use('/health', createHealthRouter(dependencies));

  app.use('/api', requireApiToken(config.api.token));
  app.get('/api/protected/ping', (_request, response) => {
    response.json({ ok: true });
  });

  app.use((_request, response) => {
    response.status(404).json({ error: 'not_found' });
  });

  app.use((error, _request, response, _next) => {
    const status = Number.isInteger(error.status) ? error.status : 500;
    response.status(status).json({
      error: status >= 500 ? 'internal_error' : error.message
    });
  });

  return app;
}
