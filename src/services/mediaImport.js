import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { constants, createReadStream } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { createMediaFilesRepository } from '../repositories/mediaFiles.js';
import { resolveInsideRoot } from '../utils/pathSafety.js';

const SUPPORTED_EXTENSIONS = new Map([
  ['.jpg', { mediaType: 'photo', mimeType: 'image/jpeg' }],
  ['.jpeg', { mediaType: 'photo', mimeType: 'image/jpeg' }],
  ['.png', { mediaType: 'photo', mimeType: 'image/png' }],
  ['.webp', { mediaType: 'photo', mimeType: 'image/webp' }],
  ['.mp3', { mediaType: 'audio', mimeType: 'audio/mpeg' }],
  ['.wav', { mediaType: 'audio', mimeType: 'audio/wav' }],
  ['.m4a', { mediaType: 'audio', mimeType: 'audio/mp4' }],
  ['.ogg', { mediaType: 'audio', mimeType: 'audio/ogg' }],
  ['.mp4', { mediaType: 'video', mimeType: 'video/mp4' }],
  ['.mov', { mediaType: 'video', mimeType: 'video/quicktime' }],
  ['.mkv', { mediaType: 'video', mimeType: 'video/x-matroska' }]
]);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function checksumFile(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

function buildStoragePath(checksum, extension) {
  return path.join(checksum.slice(0, 2), checksum.slice(2, 4), `${checksum}${extension}`);
}

export function createMediaImportService(options = {}) {
  const repository = options.repository || createMediaFilesRepository();
  const mediaRoot = options.mediaRoot || config.media.root;
  const maxBytes = options.maxBytes || config.media.maxBytes;

  async function importFromPath(sourcePath) {
    if (!sourcePath || typeof sourcePath !== 'string') {
      throw httpError(400, 'sourcePath is required');
    }

    const absoluteSource = path.resolve(sourcePath);
    const stat = await fs.stat(absoluteSource).catch(() => null);
    if (!stat || !stat.isFile()) {
      throw httpError(400, 'source file not found');
    }

    if (stat.size <= 0) {
      throw httpError(400, 'source file is empty');
    }

    if (stat.size > maxBytes) {
      throw httpError(413, 'source file is too large');
    }

    const extension = path.extname(absoluteSource).toLowerCase();
    const typeInfo = SUPPORTED_EXTENSIONS.get(extension);
    if (!typeInfo) {
      throw httpError(415, 'unsupported media format');
    }

    const checksum = await checksumFile(absoluteSource);
    const existing = await repository.findByChecksum(checksum);
    if (existing) {
      return { duplicate: true, row: existing };
    }

    const relativeStoragePath = buildStoragePath(checksum, extension);
    const absoluteDestination = resolveInsideRoot(mediaRoot, relativeStoragePath);
    await fs.mkdir(path.dirname(absoluteDestination), { recursive: true });
    await fs.copyFile(absoluteSource, absoluteDestination, constants.COPYFILE_EXCL);

    const row = await repository.insert({
      storagePath: relativeStoragePath,
      originalFilename: path.basename(absoluteSource),
      mediaType: typeInfo.mediaType,
      mimeType: typeInfo.mimeType,
      checksum,
      sizeBytes: stat.size,
      metadata: {
        importedBy: 'local_path',
        extension
      }
    });

    return { duplicate: false, row };
  }

  async function listMedia(limit) {
    return repository.list(limit);
  }

  return {
    importFromPath,
    listMedia
  };
}
