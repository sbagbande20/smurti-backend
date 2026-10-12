CREATE TABLE memories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  memory_date DATE NULL,
  date_precision ENUM('unknown', 'year', 'month', 'day', 'approximate') NOT NULL DEFAULT 'unknown',
  confidence ENUM('unknown', 'low', 'medium', 'high') NOT NULL DEFAULT 'unknown',
  tags JSON NULL,
  source_kind ENUM('manual', 'automatic') NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_memories_memory_date (memory_date),
  FULLTEXT INDEX ft_memories_text (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  storage_path VARCHAR(1024) NOT NULL,
  original_filename VARCHAR(255) NULL,
  media_type ENUM('photo', 'video', 'audio') NOT NULL,
  mime_type VARCHAR(127) NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  metadata JSON NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_checksum (checksum_sha256),
  INDEX idx_media_type (media_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transcripts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  media_file_id BIGINT UNSIGNED NOT NULL,
  transcript_text LONGTEXT NOT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'mr',
  timestamps JSON NULL,
  review_status ENUM('pending', 'reviewed', 'needs_review', 'failed') NOT NULL DEFAULT 'pending',
  processing_status ENUM('queued', 'processing', 'complete', 'failed') NOT NULL DEFAULT 'queued',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transcripts_media_file
    FOREIGN KEY (media_file_id) REFERENCES media_files(id)
    ON DELETE CASCADE,
  FULLTEXT INDEX ft_transcripts_text (transcript_text),
  INDEX idx_transcripts_media_file (media_file_id),
  INDEX idx_transcripts_review_status (review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE people (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  aliases JSON NULL,
  relationship_description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_people_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE memory_people (
  memory_id BIGINT UNSIGNED NOT NULL,
  person_id BIGINT UNSIGNED NOT NULL,
  role_description VARCHAR(255) NULL,
  PRIMARY KEY (memory_id, person_id),
  CONSTRAINT fk_memory_people_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_memory_people_person
    FOREIGN KEY (person_id) REFERENCES people(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE memory_sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  memory_id BIGINT UNSIGNED NOT NULL,
  media_file_id BIGINT UNSIGNED NULL,
  transcript_id BIGINT UNSIGNED NULL,
  excerpt_start_seconds DECIMAL(10,3) NULL,
  excerpt_end_seconds DECIMAL(10,3) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_memory_sources_memory
    FOREIGN KEY (memory_id) REFERENCES memories(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_memory_sources_media_file
    FOREIGN KEY (media_file_id) REFERENCES media_files(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_memory_sources_transcript
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id)
    ON DELETE SET NULL,
  INDEX idx_memory_sources_memory (memory_id),
  INDEX idx_memory_sources_media_file (media_file_id),
  INDEX idx_memory_sources_transcript (transcript_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  source_references JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conversation_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    ON DELETE CASCADE,
  INDEX idx_conversation_messages_conversation (conversation_id),
  FULLTEXT INDEX ft_conversation_messages_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
