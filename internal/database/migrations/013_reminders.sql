CREATE TABLE maintenance_reminders (
 id bigserial PRIMARY KEY,
 vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 interval_km numeric(12,3), interval_months integer,
 base_km numeric(12,3), base_date date,
 advance_km numeric(12,3) NOT NULL DEFAULT 0,
 advance_days integer NOT NULL DEFAULT 0,
 created_by bigint NOT NULL REFERENCES users(id),
 updated_by bigint NOT NULL REFERENCES users(id),
 CHECK(COALESCE(interval_km > 0,false) OR COALESCE(interval_months > 0,false)),
 CHECK(interval_km IS NULL OR interval_km > 0),
 CHECK(interval_months IS NULL OR interval_months BETWEEN 1 AND 1200),
 CHECK(base_km IS NULL OR base_km >= 0),
 CHECK(advance_km >= 0 AND advance_days BETWEEN 0 AND 3650)
);
CREATE INDEX maintenance_reminders_vehicle ON maintenance_reminders(vehicle_id);
CREATE TABLE maintenance_reminder_completions (
 id bigserial PRIMARY KEY,
 reminder_id bigint NOT NULL REFERENCES maintenance_reminders(id) ON DELETE CASCADE,
 entry_id bigint REFERENCES entries(id) ON DELETE SET NULL,
 actor_id bigint NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(reminder_id,entry_id)
);
CREATE TABLE maintenance_reminder_audit (
 id bigserial PRIMARY KEY, vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 reminder_id bigint NOT NULL, action text NOT NULL, actor_id bigint NOT NULL REFERENCES users(id),
 before_value jsonb, after_value jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES(13);
