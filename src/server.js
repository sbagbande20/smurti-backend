import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

const server = app.listen(config.api.port, config.api.host, () => {
  console.info(`Smurti API listening on ${config.api.host}:${config.api.port}`);
});

function shutdown(signal) {
  console.info(`${signal} received, shutting down`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
