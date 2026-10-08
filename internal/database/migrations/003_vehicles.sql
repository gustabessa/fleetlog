CREATE TABLE vehicles (
    id bigserial PRIMARY KEY,
    garage_id bigint NOT NULL REFERENCES garages(id),
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    plate text NOT NULL DEFAULT '' CHECK(length(plate)<=32),
    brand text NOT NULL DEFAULT '' CHECK(length(brand)<=100),
    model_year smallint CHECK(model_year BETWEEN 1 AND 9999),
    chassis text NOT NULL DEFAULT '' CHECK(length(chassis)<=64),
    renavam text NOT NULL DEFAULT '' CHECK(length(renavam)<=64),
    initial_km numeric(12,3) NOT NULL CHECK(initial_km>=0),
    created_by bigint NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicles_garage ON vehicles(garage_id,id);
INSERT INTO schema_migrations(version) VALUES(3);
