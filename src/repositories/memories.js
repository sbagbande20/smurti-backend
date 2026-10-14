import { createPool } from '../db/pool.js';

const MEMORY_COLUMNS = `
  id, title, description, memory_date, date_precision, confidence,
  tags, source_kind, created_at, updated_at
`;

export function createMemoriesRepository(pool = createPool()) {
  return {
    async create(memory) {
      const [result] = await pool.execute(
        `INSERT INTO memories
          (title, description, memory_date, date_precision, confidence, tags, source_kind)
         VALUES (?, ?, ?, ?, ?, ?, 'manual')`,
        [
          memory.title,
          memory.description,
          memory.memoryDate,
          memory.datePrecision,
          memory.confidence,
          JSON.stringify(memory.tags)
        ]
      );

      return this.findById(result.insertId);
    },

    async findById(id) {
      const [rows] = await pool.execute(
        `SELECT ${MEMORY_COLUMNS}
           FROM memories
          WHERE id = ?
          LIMIT 1`,
        [id]
      );

      return rows[0] || null;
    },

    async list(options = {}) {
      const limit = Math.min(Math.max(Number.parseInt(options.limit, 10) || 50, 1), 100);
      const search = typeof options.search === 'string' ? options.search.trim() : '';

      if (search) {
        const like = `%${search}%`;
        const [rows] = await pool.execute(
          `SELECT ${MEMORY_COLUMNS}
             FROM memories
            WHERE title LIKE ? OR description LIKE ?
            ORDER BY updated_at DESC, id DESC
            LIMIT ?`,
          [like, like, limit]
        );
        return rows;
      }

      const [rows] = await pool.execute(
        `SELECT ${MEMORY_COLUMNS}
           FROM memories
          ORDER BY updated_at DESC, id DESC
          LIMIT ?`,
        [limit]
      );
      return rows;
    },

    async update(id, memory) {
      await pool.execute(
        `UPDATE memories
            SET title = ?,
                description = ?,
                memory_date = ?,
                date_precision = ?,
                confidence = ?,
                tags = ?
          WHERE id = ?`,
        [
          memory.title,
          memory.description,
          memory.memoryDate,
          memory.datePrecision,
          memory.confidence,
          JSON.stringify(memory.tags),
          id
        ]
      );

      return this.findById(id);
    },

    async addSource(memoryId, source) {
      const [result] = await pool.execute(
        `INSERT INTO memory_sources
          (memory_id, media_file_id, transcript_id, excerpt_start_seconds, excerpt_end_seconds, notes)
         VALUES (?, ?, NULL, ?, ?, ?)`,
        [
          memoryId,
          source.mediaFileId,
          source.excerptStartSeconds,
          source.excerptEndSeconds,
          source.notes
        ]
      );

      const [rows] = await pool.execute(
        `SELECT id, memory_id, media_file_id, transcript_id,
                excerpt_start_seconds, excerpt_end_seconds, notes, created_at
           FROM memory_sources
          WHERE id = ?
          LIMIT 1`,
        [result.insertId]
      );

      return rows[0];
    },

    async listSources(memoryId) {
      const [rows] = await pool.execute(
        `SELECT ms.id, ms.memory_id, ms.media_file_id, ms.transcript_id,
                ms.excerpt_start_seconds, ms.excerpt_end_seconds, ms.notes, ms.created_at,
                mf.storage_path, mf.original_filename, mf.media_type, mf.mime_type,
                mf.checksum_sha256, mf.size_bytes
           FROM memory_sources ms
           LEFT JOIN media_files mf ON mf.id = ms.media_file_id
          WHERE ms.memory_id = ?
          ORDER BY ms.created_at ASC, ms.id ASC`,
        [memoryId]
      );

      return rows;
    }
  };
}
