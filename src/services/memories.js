import { createMediaFilesRepository } from '../repositories/mediaFiles.js';
import { createMemoriesRepository } from '../repositories/memories.js';

const DATE_PRECISIONS = new Set(['unknown', 'year', 'month', 'day', 'approximate']);
const CONFIDENCE_LEVELS = new Set(['unknown', 'low', 'medium', 'high']);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseId(value, name) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${name} must be a positive integer`);
  }
  return id;
}

function normalizeOptionalString(value, name, maxLength) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw httpError(400, `${name} must be text`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw httpError(400, `${name} is too long`);
  }
  return trimmed || null;
}

function normalizeMemoryPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    throw httpError(400, 'request body is required');
  }

  const title = normalizeOptionalString(payload.title, 'title', 255);
  if (!title) {
    throw httpError(400, 'title is required');
  }

  const description = normalizeOptionalString(payload.description, 'description', 5000);
  const memoryDate = normalizeOptionalString(payload.memoryDate, 'memoryDate', 10);
  if (memoryDate && !/^\d{4}-\d{2}-\d{2}$/.test(memoryDate)) {
    throw httpError(400, 'memoryDate must use YYYY-MM-DD');
  }

  const datePrecision = payload.datePrecision || (memoryDate ? 'day' : 'unknown');
  if (!DATE_PRECISIONS.has(datePrecision)) {
    throw httpError(400, 'datePrecision is invalid');
  }

  const confidence = payload.confidence || 'unknown';
  if (!CONFIDENCE_LEVELS.has(confidence)) {
    throw httpError(400, 'confidence is invalid');
  }

  const tags = payload.tags === undefined ? [] : payload.tags;
  if (!Array.isArray(tags)) {
    throw httpError(400, 'tags must be an array');
  }
  if (tags.length > 25) {
    throw httpError(400, 'too many tags');
  }

  return {
    title,
    description,
    memoryDate,
    datePrecision,
    confidence,
    tags: tags.map((tag) => {
      if (typeof tag !== 'string') {
        throw httpError(400, 'tags must contain text values');
      }
      const trimmed = tag.trim();
      if (!trimmed || trimmed.length > 64) {
        throw httpError(400, 'tag is invalid');
      }
      return trimmed;
    })
  };
}

function normalizeSourcePayload(payload = {}) {
  const mediaFileId = parseId(payload.mediaFileId, 'mediaFileId');
  const notes = normalizeOptionalString(payload.notes, 'notes', 2000);

  const excerptStartSeconds =
    payload.excerptStartSeconds === undefined || payload.excerptStartSeconds === null
      ? null
      : Number(payload.excerptStartSeconds);
  const excerptEndSeconds =
    payload.excerptEndSeconds === undefined || payload.excerptEndSeconds === null
      ? null
      : Number(payload.excerptEndSeconds);

  if (excerptStartSeconds !== null && (!Number.isFinite(excerptStartSeconds) || excerptStartSeconds < 0)) {
    throw httpError(400, 'excerptStartSeconds is invalid');
  }
  if (excerptEndSeconds !== null && (!Number.isFinite(excerptEndSeconds) || excerptEndSeconds < 0)) {
    throw httpError(400, 'excerptEndSeconds is invalid');
  }
  if (
    excerptStartSeconds !== null &&
    excerptEndSeconds !== null &&
    excerptEndSeconds < excerptStartSeconds
  ) {
    throw httpError(400, 'excerptEndSeconds must be greater than excerptStartSeconds');
  }

  return {
    mediaFileId,
    excerptStartSeconds,
    excerptEndSeconds,
    notes
  };
}

function parseTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags;
  }
  if (!rawTags) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawTags);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function toMemory(row, sources = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    memoryDate: row.memory_date,
    datePrecision: row.date_precision,
    confidence: row.confidence,
    tags: parseTags(row.tags),
    sourceKind: row.source_kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sources
  };
}

function toSource(row) {
  return {
    id: row.id,
    memoryId: row.memory_id,
    mediaFileId: row.media_file_id,
    transcriptId: row.transcript_id,
    excerptStartSeconds: row.excerpt_start_seconds === null ? null : Number(row.excerpt_start_seconds),
    excerptEndSeconds: row.excerpt_end_seconds === null ? null : Number(row.excerpt_end_seconds),
    notes: row.notes,
    createdAt: row.created_at,
    media: row.media_file_id
      ? {
          id: row.media_file_id,
          storagePath: row.storage_path,
          originalFilename: row.original_filename,
          mediaType: row.media_type,
          mimeType: row.mime_type,
          checksumSha256: row.checksum_sha256,
          sizeBytes: Number(row.size_bytes)
        }
      : null
  };
}

export function createMemoriesService(options = {}) {
  const memoriesRepository = options.memoriesRepository || createMemoriesRepository();
  const mediaRepository = options.mediaRepository || createMediaFilesRepository();

  async function createMemory(payload) {
    const normalized = normalizeMemoryPayload(payload);
    const row = await memoriesRepository.create(normalized);
    return toMemory(row);
  }

  async function listMemories(query = {}) {
    const rows = await memoriesRepository.list({
      limit: query.limit,
      search: query.search
    });
    return rows.map((row) => toMemory(row));
  }

  async function getMemory(idValue) {
    const id = parseId(idValue, 'memoryId');
    const row = await memoriesRepository.findById(id);
    if (!row) {
      throw httpError(404, 'memory not found');
    }

    const sourceRows = await memoriesRepository.listSources(id);
    return toMemory(row, sourceRows.map(toSource));
  }

  async function updateMemory(idValue, payload) {
    const id = parseId(idValue, 'memoryId');
    const existing = await memoriesRepository.findById(id);
    if (!existing) {
      throw httpError(404, 'memory not found');
    }

    const normalized = normalizeMemoryPayload({
      title: payload.title ?? existing.title,
      description: payload.description ?? existing.description,
      memoryDate: payload.memoryDate ?? existing.memory_date,
      datePrecision: payload.datePrecision ?? existing.date_precision,
      confidence: payload.confidence ?? existing.confidence,
      tags: payload.tags ?? parseTags(existing.tags)
    });
    const row = await memoriesRepository.update(id, normalized);
    return toMemory(row);
  }

  async function addSource(idValue, payload) {
    const memoryId = parseId(idValue, 'memoryId');
    const memory = await memoriesRepository.findById(memoryId);
    if (!memory) {
      throw httpError(404, 'memory not found');
    }

    const source = normalizeSourcePayload(payload);
    const media = await mediaRepository.findById(source.mediaFileId);
    if (!media) {
      throw httpError(404, 'media file not found');
    }

    return toSource(await memoriesRepository.addSource(memoryId, source));
  }

  return {
    createMemory,
    listMemories,
    getMemory,
    updateMemory,
    addSource
  };
}
