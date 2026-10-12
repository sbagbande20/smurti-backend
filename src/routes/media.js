import express from 'express';
import { createMediaImportService } from '../services/mediaImport.js';

function toClientMedia(row, duplicate = false) {
  return {
    id: row.id,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mediaType: row.media_type,
    mimeType: row.mime_type,
    checksumSha256: row.checksum_sha256,
    sizeBytes: Number(row.size_bytes),
    importedAt: row.imported_at,
    duplicate
  };
}

export function createMediaRouter(dependencies = {}) {
  const router = express.Router();
  const mediaService = dependencies.mediaService || createMediaImportService();

  router.get('/', async (request, response, next) => {
    try {
      const rows = await mediaService.listMedia(request.query.limit);
      response.json({ media: rows.map((row) => toClientMedia(row)) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/import', async (request, response, next) => {
    try {
      const result = await mediaService.importFromPath(request.body?.sourcePath);
      response.status(result.duplicate ? 200 : 201).json({
        media: toClientMedia(result.row, result.duplicate)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
