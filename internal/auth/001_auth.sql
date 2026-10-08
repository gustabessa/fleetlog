CREATE TABLE users(id bigserial PRIMARY KEY, username text NOT NULL UNIQUE, password_hash text, currency char(3) NOT NULL DEFAULT 'BRL', created_at timestamptz NOT NULL DEFAULT now());
-- External accounts will use the same internal user and session tables.
CREATE TABLE external_identities(
 issuer text NOT NULL,
 subject text NOT NULL,
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 PRIMARY KEY(issuer, subject)
);
CREATE INDEX external_identities_user ON external_identities(user_id);
CREATE TABLE sessions(token_hash text PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
INSERT INTO schema_migrations(version) VALUES(1);
