ALTER TABLE users ADD COLUMN palette text NOT NULL DEFAULT 'original',
 ADD COLUMN theme text NOT NULL DEFAULT 'light';
ALTER TABLE users ADD CONSTRAINT users_palette CHECK (palette IN
 ('original','orange','blue','violet','green','rose','amber','cyan','red','lime','mono','copper')),
 ADD CONSTRAINT users_theme CHECK (theme IN ('light','dark'));
INSERT INTO schema_migrations(version) VALUES(4);
