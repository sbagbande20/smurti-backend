import express from 'express';
import { checkDatabase } from '../db/pool.js';
import { checkOllama } from '../services/ollama.js';

export function createHealthRouter(dependencies = {}) {
  const router = express.Router();
  const dbCheck = dependencies.dbCheck || checkDatabase;
  const aiCheck = dependencies.aiCheck || checkOllama;

  router.get('/', (_request, response) => {
    response.json({
      ok: true,
      service: 'aajoba-memory-api'
    });
  });

  router.get('/db', async (_request, response, next) => {
    try {
      const ok = await dbCheck();
      response.status(ok ? 200 : 503).json({ ok });
    } catch (_error) {
      response.status(503).json({ ok: false });
    }
  });

  router.get('/ai', async (_request, response, next) => {
    try {
      const result = await aiCheck();
      response.status(result.available ? 200 : 503).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
