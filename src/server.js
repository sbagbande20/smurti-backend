import { createApp } from './app.js';
import { config } from './config.js';
import { checkDatabase } from './db/pool.js';

const app = createApp();

const server = app.listen(config.api.port, config.api.host, () => {
  console.info(`Smurti API listening on ${config.api.host}:${config.api.port}`);
  checkDatabase()
    .then(() => {
      console.info(`Database connected: ${config.db.database} at ${config.db.host}:${config.db.port}`);
    })
    .catch((error) => {
      const reason = error.code || error.message || 'unknown_error';
      console.warn(`Database unavailable: ${reason}. Check MySQL service and .env credentials`);
    });
});

function shutdown(signal) {
  console.info(`${signal} received, shutting down`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
