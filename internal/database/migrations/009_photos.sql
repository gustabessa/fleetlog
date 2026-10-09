CREATE TABLE photo_objects (
 object_key text PRIMARY KEY,
 content_type text NOT NULL,
 byte_size bigint NOT NULL,
 width integer NOT NULL,
 height integer NOT NULL,
 state text NOT NULL CHECK(state IN ('pending','active','delete')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE vehicle_photos (
 vehicle_id bigint PRIMARY KEY REFERENCES vehicles(id),
 object_key text NOT NULL UNIQUE REFERENCES photo_objects(object_key)
);
INSERT INTO schema_migrations(version) VALUES(9);
