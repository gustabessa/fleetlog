CREATE TABLE item_references (
 id bigserial PRIMARY KEY,
 garage_id bigint NOT NULL REFERENCES garages(id),
 name text NOT NULL,
 brand text NOT NULL DEFAULT '',
 code text NOT NULL DEFAULT '',
 unit text NOT NULL CHECK(unit IN ('unit','liter','hour')),
 UNIQUE(garage_id,name,brand,code,unit)
);
INSERT INTO schema_migrations(version) VALUES(8);
