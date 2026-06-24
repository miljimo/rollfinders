package server

import (
	"context"
	"strings"
)

func (s *server) ensureBootstrapSuperAdmin(ctx context.Context) error {
	email := strings.ToLower(strings.TrimSpace(s.cfg.SuperAdminEmail))
	if email == "" || s.cfg.SuperAdminPass == "" {
		return nil
	}
	passwordHash, err := hashPassword(s.cfg.SuperAdminPass)
	if err != nil {
		return err
	}
	id := "usr_bootstrap_super_admin"
	name := strings.TrimSpace(s.cfg.SuperAdminName)
	if name == "" {
		name = "RollFinder Admin"
	}
	firstName := name
	if fields := strings.Fields(name); len(fields) > 0 {
		firstName = fields[0]
	}
	_, err = s.db.Procedure(ctx, `users."bootstrapSuperAdmin"`, id, name, firstName, email, passwordHash)
	return err
}
