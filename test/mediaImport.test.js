import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createMediaImportService } from '../src/services/mediaImport.js';

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'smurti-media-test-'));
}

function createMemoryRepository() {
  const rows = [];

  return {
    rows,
    async findByChecksum(checksum) {
      return rows.find((row) => row.checksum_sha256 === checksum) || null;
    },
    async insert(mediaFile) {
      const row = {
        id: rows.length + 1,
        storage_path: mediaFile.storagePath,
        original_filename: mediaFile.originalFilename,
        media_type: mediaFile.mediaType,
        mime_type: mediaFile.mimeType,
        checksum_sha256: mediaFile.checksum,
        size_bytes: mediaFile.sizeBytes
      };
      rows.push(row);
      return row;
    },
    async list() {
      return rows;
    }
  };
}

test('imports a supported media file into controlled storage', async () => {
  const root = await makeTempDir();
  const sourceDir = await makeTempDir();
  const sourcePath = path.join(sourceDir, 'voice.wav');
  await fs.writeFile(sourcePath, 'sample audio bytes');

  const repository = createMemoryRepository();
  const service = createMediaImportService({
    repository,
    mediaRoot: root,
    maxBytes: 1024
  });

  const result = await service.importFromPath(sourcePath);

  assert.equal(result.duplicate, false);
  assert.equal(result.row.original_filename, 'voice.wav');
  assert.equal(result.row.media_type, 'audio');

  const copiedPath = path.join(root, result.row.storage_path);
  const copied = await fs.readFile(copiedPath, 'utf8');
  assert.equal(copied, 'sample audio bytes');
});

test('returns existing row for duplicate checksum', async () => {
  const root = await makeTempDir();
  const sourceDir = await makeTempDir();
  const firstPath = path.join(sourceDir, 'first.mp3');
  const secondPath = path.join(sourceDir, 'second.mp3');
  await fs.writeFile(firstPath, 'same bytes');
  await fs.writeFile(secondPath, 'same bytes');

  const repository = createMemoryRepository();
  const service = createMediaImportService({
    repository,
    mediaRoot: root,
    maxBytes: 1024
  });

  const first = await service.importFromPath(firstPath);
  const second = await service.importFromPath(secondPath);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.row.id, first.row.id);
  assert.equal(repository.rows.length, 1);
});

test('rejects unsupported file extensions', async () => {
  const root = await makeTempDir();
  const sourceDir = await makeTempDir();
  const sourcePath = path.join(sourceDir, 'notes.txt');
  await fs.writeFile(sourcePath, 'not media');

  const service = createMediaImportService({
    repository: createMemoryRepository(),
    mediaRoot: root,
    maxBytes: 1024
  });

  await assert.rejects(
    () => service.importFromPath(sourcePath),
    (error) => error.status === 415 && error.message === 'unsupported media format'
  );
});

test('rejects oversized files', async () => {
  const root = await makeTempDir();
  const sourceDir = await makeTempDir();
  const sourcePath = path.join(sourceDir, 'large.jpg');
  await fs.writeFile(sourcePath, 'too large');

  const service = createMediaImportService({
    repository: createMemoryRepository(),
    mediaRoot: root,
    maxBytes: 4
  });

  await assert.rejects(
    () => service.importFromPath(sourcePath),
    (error) => error.status === 413 && error.message === 'source file is too large'
  );
});
