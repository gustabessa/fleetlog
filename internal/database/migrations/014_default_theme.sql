-- Keep existing preferences; only accounts created after this migration change.
ALTER TABLE users ALTER COLUMN palette SET DEFAULT 'orange';
ALTER TABLE users ALTER COLUMN theme SET DEFAULT 'dark';
INSERT INTO schema_migrations(version) VALUES(14);
