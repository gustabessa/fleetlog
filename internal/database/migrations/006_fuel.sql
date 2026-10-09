CREATE TABLE entries (
 id bigserial PRIMARY KEY,
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 kind text NOT NULL CHECK(kind IN ('fuel')),
 entry_date date NOT NULL,
 title text NOT NULL,
 amount numeric(18,6) NOT NULL CHECK(amount>=0),
 currency char(3) NOT NULL,
 km numeric(12,3),
 details jsonb NOT NULL DEFAULT '{}',
 created_by bigint NOT NULL REFERENCES users(id),
 updated_by bigint NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entries_vehicle_date ON entries(vehicle_id,entry_date,id);
CREATE TABLE entry_audit (
 id bigserial PRIMARY KEY,
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 entry_id bigint NOT NULL,
 action text NOT NULL,
 actor_id bigint NOT NULL REFERENCES users(id),
 before_value jsonb,
 after_value jsonb,
 changed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES(6);
