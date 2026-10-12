# Smurti Backend

Private, local-first backend for the Smurti Marathi memory companion.

Phase 1 includes:

- Express API bound to `127.0.0.1` by default.
- Bearer-token protection for `/api/*` routes.
- Public health checks for API, database, and local AI availability.
- MySQL schema migrations for core memory, media, transcript, people, source, and conversation records.
- Local-only Ollama status integration with no cloud fallback.
- Safe environment configuration examples.

## Requirements

- Node.js 20 or newer.
- MySQL Community Server 8.
- Ollama installed locally when AI testing begins. The backend does not call cloud AI services.

Current local inspection on 2026-10-12:

- Node: `v20.19.6`
- npm: `10.8.2`
- MySQL: `8.0.44`
- Ollama: not found on PATH

## Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy environment configuration:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` and set:

   - `API_TOKEN` to a long random value.
   - `DB_USER`, `DB_PASSWORD`, and `DB_NAME` for a restricted local MySQL user.
   - `MEDIA_ROOT` to a private folder outside this repository.

4. Create the local database and restricted user in MySQL. Example:

   ```sql
   CREATE DATABASE smurti CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'smurti_app'@'localhost' IDENTIFIED BY 'replace-with-local-db-password';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
     ON smurti.* TO 'smurti_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. Run migrations:

   ```powershell
   npm run migrate
   ```

6. Start the API:

   ```powershell
   npm start
   ```

The API listens on `127.0.0.1:3000` unless changed in `.env`.

## Health Checks

- `GET /health` returns API status.
- `GET /health/db` checks MySQL connectivity.
- `GET /health/ai` checks the configured local Ollama model.

Protected API routes require:

```http
Authorization: Bearer <API_TOKEN>
```

## Important Security Defaults

- Do not commit `.env`, recordings, transcripts, backups, exports, or private media.
- Keep MySQL and Ollama bound to localhost.
- Do not configure router port forwarding.
- Enable phone access only after the deployment checklist is completed.
- Do not use cloud AI fallback services.
