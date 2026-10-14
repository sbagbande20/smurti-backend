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

test('media import endpoint requires authentication', async () => {
  const app = createApp();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/media/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sourcePath: 'D:\\sample.wav' })
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'unauthorized');
  });
});

test('media import endpoint returns imported media metadata', async () => {
  const app = createApp({
    mediaService: {
      async importFromPath(sourcePath) {
        assert.equal(sourcePath, 'D:\\sample.wav');
        return {
          duplicate: false,
          row: {
            id: 1,
            storage_path: 'aa/bb/example.wav',
            original_filename: 'sample.wav',
            media_type: 'audio',
            mime_type: 'audio/wav',
            checksum_sha256: 'a'.repeat(64),
            size_bytes: 123,
            imported_at: '2026-10-12T00:00:00.000Z'
          }
        };
      },
      async listMedia() {
        return [];
      }
    }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/media/import`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token-with-at-least-32-characters',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sourcePath: 'D:\\sample.wav' })
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.media.originalFilename, 'sample.wav');
    assert.equal(body.media.mediaType, 'audio');
    assert.equal(body.media.duplicate, false);
  });
});

test('memory endpoints require authentication', async () => {
  const app = createApp();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'Test' })
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'unauthorized');
  });
});

test('memory endpoint returns created memory metadata', async () => {
  const app = createApp({
    memoriesService: {
      async createMemory(payload) {
        assert.equal(payload.title, 'आजोबांची आठवण');
        return {
          id: 1,
          title: payload.title,
          description: null,
          memoryDate: null,
          datePrecision: 'unknown',
          confidence: 'unknown',
          tags: ['कुटुंब'],
          sourceKind: 'manual',
          createdAt: '2026-10-12T00:00:00.000Z',
          updatedAt: '2026-10-12T00:00:00.000Z',
          sources: []
        };
      }
    }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/memories`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token-with-at-least-32-characters',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'आजोबांची आठवण', tags: ['कुटुंब'] })
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.memory.title, 'आजोबांची आठवण');
    assert.deepEqual(body.memory.tags, ['कुटुंब']);
  });
});
