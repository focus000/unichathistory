export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS import_batches (
    id                  TEXT PRIMARY KEY,
    platform            TEXT NOT NULL,
    source_folder       TEXT NOT NULL,
    archive_path        TEXT NOT NULL,
    imported_at         INTEGER NOT NULL,
    conversation_count  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT PRIMARY KEY,
    platform        TEXT NOT NULL,
    external_id     TEXT NOT NULL,
    title           TEXT,
    created_at      INTEGER,
    updated_at      INTEGER,
    model           TEXT,
    message_count   INTEGER NOT NULL DEFAULT 0,
    batch_id        TEXT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES import_batches(id)
);
CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_platform ON conversations(platform);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    seq             INTEGER NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    created_at      INTEGER,
    raw_json        TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, seq);

CREATE TABLE IF NOT EXISTS attachments (
    id              TEXT PRIMARY KEY,
    message_id      TEXT NOT NULL,
    filename        TEXT,
    mime_type       TEXT,
    archive_path    TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    title           UNINDEXED,
    conversation_id UNINDEXED,
    content=messages,
    content_rowid=rowid,
    tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content, conversation_id)
    VALUES (new.rowid, new.content, new.conversation_id);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content, conversation_id)
    VALUES ('delete', old.rowid, old.content, old.conversation_id);
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content, conversation_id)
    VALUES ('delete', old.rowid, old.content, old.conversation_id);
    INSERT INTO messages_fts(rowid, content, conversation_id)
    VALUES (new.rowid, new.content, new.conversation_id);
END;
`
