ALTER TABLE users DROP CONSTRAINT users_palette;
ALTER TABLE users ADD CONSTRAINT users_palette CHECK (palette IN ('original','orange','blue','violet','green','rose','amber','cyan','red','lime','mono','copper','navy','emerald','lavender','magenta','ruby','sand','olive','arctic','indigo','mint','lemon','coral'));
INSERT INTO schema_migrations(version) VALUES(15);
