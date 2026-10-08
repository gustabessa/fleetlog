package auth

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
)

type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Currency string `json:"currency"`
}
type userKey struct{}

func UserFromContext(ctx context.Context) (User, bool) {
	user, ok := ctx.Value(userKey{}).(User)
	return user, ok
}

// RequireUser resolves the session on each request, including expiry/revocation.
func (s *Service) RequireUser(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		cookie, err := r.Cookie("fleetlog_session")
		if err != nil {
			reply(w, 401, map[string]string{"error": "authentication required"})
			return
		}
		var user User
		err = s.DB.QueryRow(r.Context(), `SELECT u.id,u.username,u.currency FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()`, digest(cookie.Value)).Scan(&user.ID, &user.Username, &user.Currency)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				reply(w, 401, map[string]string{"error": "authentication required"})
			} else {
				reply(w, 503, map[string]string{"error": "authentication unavailable"})
			}
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), userKey{}, user)))
	}
}

// RequireWrite combines authenticated access and same-origin JSON protection.
func (s *Service) RequireWrite(next http.HandlerFunc) http.HandlerFunc {
	return s.RequireUser(s.write(next))
}

// RequireJSON protects writes by origin and content type; pair with authentication/authorization.
func (s *Service) RequireJSON(next http.HandlerFunc) http.HandlerFunc { return s.write(next) }
