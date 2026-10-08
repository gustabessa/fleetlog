CREATE TABLE garages (
    id bigserial PRIMARY KEY,
    name text NOT NULL CHECK (length(trim(name)) > 0),
    created_by bigint NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE garage_members (
    garage_id bigint NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (garage_id, user_id)
);
CREATE INDEX garage_members_user ON garage_members(user_id);
-- Existing accounts receive their own garage on this migration only.
-- Future family membership will be assigned explicitly, not during every startup.
WITH initial AS (
    INSERT INTO garages(name, created_by)
    SELECT 'Minha garagem', id FROM users
    RETURNING id, created_by
)
INSERT INTO garage_members(garage_id, user_id)
SELECT id, created_by FROM initial;
INSERT INTO schema_migrations(version) VALUES (2);
