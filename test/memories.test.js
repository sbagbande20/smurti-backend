import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoriesService } from '../src/services/memories.js';

function memoryRow(overrides = {}) {
  return {
    id: 1,
    title: 'आजोबांची आठवण',
    description: 'पहिली चाचणी आठवण',
    memory_date: '2020-01-02',
    date_precision: 'day',
    confidence: 'high',
    tags: JSON.stringify(['कुटुंब']),
    source_kind: 'manual',
    created_at: '2026-10-12T00:00:00.000Z',
    updated_at: '2026-10-12T00:00:00.000Z',
    ...overrides
  };
}

function createMockRepositories() {
  const memories = [];
  const sources = [];
  const mediaRows = new Map([
    [
      1,
      {
        id: 1,
        storage_path: 'c5/2a/sample.jpg',
        original_filename: 'sample.jpg',
        media_type: 'photo',
        mime_type: 'image/jpeg',
        checksum_sha256: 'a'.repeat(64),
        size_bytes: 123
      }
    ]
  ]);

  return {
    memoriesRepository: {
      async create(payload) {
        const row = memoryRow({
          id: memories.length + 1,
          title: payload.title,
          description: payload.description,
          memory_date: payload.memoryDate,
          date_precision: payload.datePrecision,
          confidence: payload.confidence,
          tags: JSON.stringify(payload.tags)
        });
        memories.push(row);
        return row;
      },
      async findById(id) {
        return memories.find((row) => row.id === Number(id)) || null;
      },
      async list() {
        return memories;
      },
      async update(id, payload) {
        const index = memories.findIndex((row) => row.id === Number(id));
        memories[index] = {
          ...memories[index],
          title: payload.title,
          description: payload.description,
          memory_date: payload.memoryDate,
          date_precision: payload.datePrecision,
          confidence: payload.confidence,
          tags: JSON.stringify(payload.tags)
        };
        return memories[index];
      },
      async addSource(memoryId, source) {
        const row = {
          id: sources.length + 1,
          memory_id: Number(memoryId),
          media_file_id: source.mediaFileId,
          transcript_id: null,
          excerpt_start_seconds: source.excerptStartSeconds,
          excerpt_end_seconds: source.excerptEndSeconds,
          notes: source.notes,
          created_at: '2026-10-12T00:00:00.000Z'
        };
        sources.push(row);
        return row;
      },
      async listSources(memoryId) {
        return sources.filter((row) => row.memory_id === Number(memoryId));
      }
    },
    mediaRepository: {
      async findById(id) {
        return mediaRows.get(Number(id)) || null;
      }
    }
  };
}

test('creates a Marathi memory with tags and date metadata', async () => {
  const service = createMemoriesService(createMockRepositories());

  const memory = await service.createMemory({
    title: 'आजोबांची आठवण',
    description: 'पहिली चाचणी आठवण',
    memoryDate: '2020-01-02',
    datePrecision: 'day',
    confidence: 'high',
    tags: ['कुटुंब']
  });

  assert.equal(memory.id, 1);
  assert.equal(memory.title, 'आजोबांची आठवण');
  assert.deepEqual(memory.tags, ['कुटुंब']);
});

test('rejects a memory without title', async () => {
  const service = createMemoriesService(createMockRepositories());

  await assert.rejects(
    () => service.createMemory({ description: 'missing title' }),
    (error) => error.status === 400 && error.message === 'title is required'
  );
});

test('rejects invalid memory date format', async () => {
  const service = createMemoriesService(createMockRepositories());

  await assert.rejects(
    () => service.createMemory({ title: 'Test', memoryDate: '12-10-2026' }),
    (error) => error.status === 400 && error.message === 'memoryDate must use YYYY-MM-DD'
  );
});

test('links imported media to an existing memory', async () => {
  const service = createMemoriesService(createMockRepositories());
  const memory = await service.createMemory({ title: 'Test memory' });

  const source = await service.addSource(memory.id, {
    mediaFileId: 1,
    notes: 'मुख्य फोटो'
  });

  assert.equal(source.memoryId, memory.id);
  assert.equal(source.mediaFileId, 1);
  assert.equal(source.notes, 'मुख्य फोटो');
});

test('rejects links to missing media files', async () => {
  const service = createMemoriesService(createMockRepositories());
  const memory = await service.createMemory({ title: 'Test memory' });

  await assert.rejects(
    () => service.addSource(memory.id, { mediaFileId: 999 }),
    (error) => error.status === 404 && error.message === 'media file not found'
  );
});
