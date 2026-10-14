# Phase 1 Security Checklist

Complete this checklist before importing real family memories or enabling phone access.

## Local Services

- [ ] API binds to `127.0.0.1` during local development.
- [ ] MySQL accepts only local connections.
- [ ] Ollama accepts only local connections.
- [ ] No router port forwarding exists for this app.
- [ ] Windows Firewall rules are reviewed before any LAN testing.

## Secrets

- [ ] `.env` exists locally and is not committed to Git.
- [ ] `API_TOKEN` is at least 32 random characters.
- [ ] MySQL uses a restricted app user, not root.
- [ ] Database password is not reused elsewhere.
- [ ] No secrets appear in logs or documentation examples.

## Data Protection

- [ ] `MEDIA_ROOT` points outside the source repository.
- [ ] Imported originals are preserved unchanged.
- [ ] Backups are encrypted before storing outside the PC.
- [ ] Backup restoration is tested with sample data.
- [ ] Deletion behavior is documented before deleting original files.

## AI And Transcription

- [ ] Ollama is installed locally before AI testing.
- [ ] The selected model is downloaded locally.
- [ ] `GET /health/ai` reports the expected local model.
- [ ] No cloud AI API keys are configured.
- [ ] Transcription uses only a local Whisper-compatible tool.

## Validation

- [ ] Unauthorized `/api/*` requests return `401`.
- [ ] File path traversal checks are tested.
- [ ] Media import accepts only supported formats.
- [ ] Media duplicate detection is tested with sample files.
- [ ] Memory creation accepts Marathi Unicode text correctly.
- [ ] Memory-source links reject missing media IDs.
- [ ] Oversized request bodies are rejected.
- [ ] Client-facing errors do not expose stack traces or sensitive paths.
- [ ] Sample data is used before importing the full archive.
