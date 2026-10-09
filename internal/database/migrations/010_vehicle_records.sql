ALTER TABLE vehicles ADD COLUMN archived boolean NOT NULL DEFAULT false;
CREATE TABLE vehicle_notes (
 id bigserial PRIMARY KEY,
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 content text NOT NULL,
 created_by bigint NOT NULL REFERENCES users(id),
 updated_by bigint NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE vehicle_transactions (
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 kind text NOT NULL CHECK(kind IN ('purchase','sale')),
 transaction_date date NOT NULL,
 amount numeric(18,6) NOT NULL CHECK(amount>=0),
 currency char(3) NOT NULL,
 party text NOT NULL DEFAULT '',
 PRIMARY KEY(vehicle_id,kind)
);
CREATE TABLE vehicle_audit (
 id bigserial PRIMARY KEY,
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 actor_id bigint NOT NULL REFERENCES users(id),
 before_value jsonb NOT NULL,
 after_value jsonb NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE entries DROP CONSTRAINT entries_kind_check;
ALTER TABLE entries ADD CONSTRAINT entries_kind_check CHECK(kind IN ('fuel','service','expense'));
INSERT INTO schema_migrations(version) VALUES(10);
