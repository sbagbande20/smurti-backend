import { createPool } from '../db/pool.js';

export function createMediaFilesRepository(pool = createPool()) {
  return {
    async findById(id) {
      const [rows] = await pool.execute(
        `SELECT id, storage_path, original_filename, media_type, mime_type,
                checksum_sha256, size_bytes, imported_at
           FROM media_files
          WHERE id = ?
          LIMIT 1`,
        [id]
      );

      return rows[0] || null;
    },

    async findByChecksum(checksum) {
      const [rows] = await pool.execute(
        `SELECT id, storage_path, original_filename, media_type, mime_type,
                checksum_sha256, size_bytes, imported_at
           FROM media_files
          WHERE checksum_sha256 = ?
          LIMIT 1`,
        [checksum]
      );

      return rows[0] || null;
    },

    async insert(mediaFile) {
      const [result] = await pool.execute(
        `INSERT INTO media_files
          (storage_path, original_filename, media_type, mime_type, checksum_sha256, size_bytes, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          mediaFile.storagePath,
          mediaFile.originalFilename,
          mediaFile.mediaType,
          mediaFile.mimeType,
          mediaFile.checksum,
          mediaFile.sizeBytes,
          JSON.stringify(mediaFile.metadata || {})
        ]
      );

      return {
        id: result.insertId,
        storage_path: mediaFile.storagePath,
        original_filename: mediaFile.originalFilename,
        media_type: mediaFile.mediaType,
        mime_type: mediaFile.mimeType,
        checksum_sha256: mediaFile.checksum,
        size_bytes: mediaFile.sizeBytes
      };
    },

    async list(limit = 50) {
      const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
      const [rows] = await pool.execute(
        `SELECT id, storage_path, original_filename, media_type, mime_type,
                checksum_sha256, size_bytes, imported_at
           FROM media_files
          ORDER BY imported_at DESC, id DESC
          LIMIT ?`,
        [safeLimit]
      );

      return rows;
    }
  };
}
