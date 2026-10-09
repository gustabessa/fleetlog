ALTER TABLE vehicles ADD COLUMN tag_color text NOT NULL DEFAULT '#087e83' CHECK(tag_color ~ '^#[0-9a-fA-F]{6}$');
CREATE TABLE note_photos (
 note_id bigint PRIMARY KEY REFERENCES vehicle_notes(id) ON DELETE CASCADE,
 object_key text NOT NULL UNIQUE REFERENCES photo_objects(object_key)
);
INSERT INTO schema_migrations(version) VALUES(12);
