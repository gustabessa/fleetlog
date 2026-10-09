ALTER TABLE entries DROP CONSTRAINT entries_kind_check;
ALTER TABLE entries ADD CONSTRAINT entries_kind_check CHECK(kind IN ('fuel','service'));
INSERT INTO schema_migrations(version) VALUES(7);
