CREATE TABLE odometer_readings (
 id bigserial PRIMARY KEY,
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 reading_date date NOT NULL,
 km numeric(12,3) NOT NULL CHECK(km>=0),
 origin text NOT NULL CHECK(origin IN ('manual','fuel','service')),
 source_id bigint NOT NULL,
 created_by bigint NOT NULL REFERENCES users(id),
 updated_by bigint NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(vehicle_id,origin,source_id)
);
CREATE INDEX odometer_vehicle_date ON odometer_readings(vehicle_id,reading_date,id);
CREATE TABLE odometer_audit (
 id bigserial PRIMARY KEY,
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 reading_id bigint NOT NULL,
 action text NOT NULL,
 actor_id bigint NOT NULL REFERENCES users(id),
 before_value jsonb,
 after_value jsonb,
 changed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES(5);
