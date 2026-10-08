package database

import (
	"context"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5"
)

//go:embed migrations/*.sql
var migrations embed.FS

// Migrate runs inside the caller's startup transaction and advisory lock.
// Applied migrations are immutable; upgrades append a new version.
func Migrate(ctx context.Context, tx pgx.Tx) error {
	if _, err := tx.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`); err != nil {
		return err
	}
	for _, m := range []struct {
		version int
		file    string
	}{{1, "001_auth.sql"}, {2, "002_garages.sql"}} {
		var applied bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)`, m.version).Scan(&applied); err != nil {
			return err
		}
		if applied {
			continue
		}
		sql, err := migrations.ReadFile("migrations/" + m.file)
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("migration %d: %w", m.version, err)
		}
	}
	return nil
}

func CreateInitialGarage(ctx context.Context, tx pgx.Tx, userID int64) error {
	_, err := tx.Exec(ctx, `WITH initial AS (INSERT INTO garages(name,created_by) VALUES('Minha garagem',$1) RETURNING id) INSERT INTO garage_members(garage_id,user_id) SELECT id,$1 FROM initial`, userID)
	return err
}
