import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

const DEFAULT_MEDIA_ROOT = 'D:\\AajobaMemory\\media';

function readInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function readRequired(name, options = {}) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    if (options.allowTestDefault && process.env.NODE_ENV === 'test') {
      return options.testDefault;
    }
    throw new Error(`${name} is required`);
  }

  return value;
}

function assertLocalUrl(name, value) {
  const parsed = new URL(value);
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(`${name} must point to localhost or 127.0.0.1`);
  }
  return parsed.toString().replace(/\/$/, '');
}

function normalizeMediaRoot(value) {
  return path.resolve(value || DEFAULT_MEDIA_ROOT);
}

export function loadConfig() {
  const apiToken = readRequired('API_TOKEN', {
    allowTestDefault: true,
    testDefault: 'test-token-with-at-least-32-characters'
  });

  if (apiToken.length < 32) {
    throw new Error('API_TOKEN must be at least 32 characters');
  }

  return {
    env: process.env.NODE_ENV || 'development',
    api: {
      host: process.env.API_HOST || '127.0.0.1',
      port: readInteger('API_PORT', 3000),
      token: apiToken
    },
    db: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: readInteger('DB_PORT', 3306),
      user: readRequired('DB_USER', {
        allowTestDefault: true,
        testDefault: 'test'
      }),
      password: readRequired('DB_PASSWORD', {
        allowTestDefault: true,
        testDefault: 'test'
      }),
      database: readRequired('DB_NAME', {
        allowTestDefault: true,
        testDefault: 'aajoba_memory_test'
      })
    },
    media: {
      root: normalizeMediaRoot(process.env.MEDIA_ROOT)
    },
    ai: {
      ollamaBaseUrl: assertLocalUrl(
        'OLLAMA_BASE_URL',
        process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
      ),
      ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
      whisperCommand: process.env.WHISPER_COMMAND || ''
    }
  };
}

export const config = loadConfig();
