import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

async function withServer(app, callback) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health endpoint returns basic service status', async () => {
  const app = createApp();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'smurti-api');
  });
});

test('protected API rejects requests without bearer token', async () => {
  const app = createApp();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/protected/ping`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'unauthorized');
  });
});

test('protected API accepts configured bearer token', async () => {
  const app = createApp();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/protected/ping`, {
      headers: {
        Authorization: 'Bearer test-token-with-at-least-32-characters'
      }
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
  });
});

test('AI health reports missing local model without cloud fallback', async () => {
  const app = createApp({
    aiCheck: async () => ({
      available: false,
      service: 'ollama',
      localOnly: true,
      model: 'qwen2.5:3b',
      reason: 'model_missing'
    })
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health/ai`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.localOnly, true);
    assert.equal(body.reason, 'model_missing');
  });
});
