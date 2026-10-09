CREATE TABLE oidc_flows (
 state_hash text PRIMARY KEY,
 browser_hash text NOT NULL,
 nonce text NOT NULL,
 verifier text NOT NULL,
 link_user_id bigint REFERENCES users(id),
 session_hash text,
 expires_at timestamptz NOT NULL
);
CREATE INDEX oidc_flows_expiry ON oidc_flows(expires_at);
INSERT INTO schema_migrations(version) VALUES(11);
