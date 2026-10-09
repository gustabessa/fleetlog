package garage

import (
	"errors"
	"fleetlog/internal/apiutil"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"
)

func (s *Service) memberRoutes(m *http.ServeMux) {
	base := "/api/garages/{garageID}/members"
	m.HandleFunc("GET "+base, s.RequireCreator(s.members))
	m.HandleFunc("POST "+base, s.RequireCreatorWrite(s.addMember))
	m.HandleFunc("DELETE "+base+"/{userID}", s.RequireCreatorWrite(s.removeMember))
}
func (s *Service) RequireCreator(next http.HandlerFunc) http.HandlerFunc {
	return s.RequireMember(func(w http.ResponseWriter, r *http.Request) {
		g, _ := FromContext(r.Context())
		if !g.CanManage {
			reply(w, 403, map[string]string{"error": "only creator can manage members"})
			return
		}
		next(w, r)
	})
}

// All current members can mutate product data; management remains creator-only.
func (s *Service) RequireMemberWrite(next http.HandlerFunc) http.HandlerFunc {
	return s.RequireMember(s.Auth.RequireJSON(next))
}
func (s *Service) members(w http.ResponseWriter, r *http.Request) {
	g, _ := FromContext(r.Context())
	rows, err := s.Auth.DB.Query(r.Context(), `SELECT u.id,u.username,u.id=g.created_by,EXISTS(SELECT 1 FROM external_identities x WHERE x.user_id=u.id) FROM garage_members m JOIN users u ON u.id=m.user_id JOIN garages g ON g.id=m.garage_id WHERE m.garage_id=$1 ORDER BY u.id`, g.ID)
	if err != nil {
		reply(w, 503, map[string]string{"error": "members unavailable"})
		return
	}
	defer rows.Close()
	type member struct {
		ID         int64  `json:"id"`
		Username   string `json:"username"`
		Owner      bool   `json:"owner"`
		OIDCLinked bool   `json:"oidcLinked"`
	}
	list := []member{}
	for rows.Next() {
		var m member
		if rows.Scan(&m.ID, &m.Username, &m.Owner, &m.OIDCLinked) != nil {
			reply(w, 503, map[string]string{"error": "members unavailable"})
			return
		}
		list = append(list, m)
	}
	if rows.Err() != nil {
		reply(w, 503, map[string]string{"error": "members unavailable"})
		return
	}
	reply(w, 200, list)
}
func (s *Service) addMember(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Existing bool   `json:"existing"`
	}
	if !apiutil.Decode(w, r, &input) {
		return
	}
	input.Username = strings.TrimSpace(input.Username)
	if input.Username == "" || len(input.Username) > 64 || !utf8.ValidString(input.Username) || strings.ContainsAny(input.Username, "\x00\r\n") || input.Existing && input.Password != "" || !input.Existing && (len(input.Password) < 12 || len(input.Password) > 72) {
		reply(w, 400, map[string]string{"error": "username and initial password (12-72 bytes) required for a new account"})
		return
	}
	var hash []byte
	var err error
	if !input.Existing {
		hash, err = bcrypt.GenerateFromPassword([]byte(input.Password), 12)
		if err != nil {
			reply(w, 503, map[string]string{"error": "account unavailable"})
			return
		}
	}
	tx, err := s.Auth.DB.Begin(r.Context())
	if err != nil {
		reply(w, 503, map[string]string{"error": "members unavailable"})
		return
	}
	defer tx.Rollback(r.Context())
	var id int64
	if input.Existing {
		err = tx.QueryRow(r.Context(), `SELECT id FROM users WHERE username=$1`, input.Username).Scan(&id)
	} else {
		err = tx.QueryRow(r.Context(), `INSERT INTO users(username,password_hash) VALUES($1,$2) RETURNING id`, input.Username, string(hash)).Scan(&id)
	}
	if err != nil {
		var pgerr *pgconn.PgError
		if errors.As(err, &pgerr) && pgerr.Code == "23505" {
			reply(w, 409, map[string]string{"error": "username already exists"})
		} else {
			reply(w, 400, map[string]string{"error": "account could not be added"})
		}
		return
	}
	g, _ := FromContext(r.Context())
	if _, err = tx.Exec(r.Context(), `INSERT INTO garage_members(garage_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, g.ID, id); err != nil {
		reply(w, 503, map[string]string{"error": "members unavailable"})
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		reply(w, 503, map[string]string{"error": "members unavailable"})
		return
	}
	s.members(w, r)
}
func (s *Service) removeMember(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("userID"), 10, 64)
	g, _ := FromContext(r.Context())
	if err != nil || id <= 0 {
		reply(w, 404, map[string]string{"error": "member not found"})
		return
	}
	if id == g.CreatedBy {
		reply(w, 409, map[string]string{"error": "creator cannot be removed"})
		return
	}
	result, err := s.Auth.DB.Exec(r.Context(), `DELETE FROM garage_members WHERE garage_id=$1 AND user_id=$2`, g.ID, id)
	if err != nil {
		reply(w, 503, map[string]string{"error": "members unavailable"})
		return
	}
	if result.RowsAffected() == 0 {
		reply(w, 404, map[string]string{"error": "member not found"})
		return
	}
	s.members(w, r)
}
