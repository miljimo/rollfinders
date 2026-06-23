package server

import (
	"context"
	"database/sql"
	"errors"
	"net/url"
	"time"

	_ "github.com/lib/pq"
)

var errNotFound = errors.New("not found")

type repository struct {
	db *sql.DB
}

type Organisation struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Application struct {
	ID             string    `json:"id"`
	OrganisationID string    `json:"organisation_id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ApplicationService struct {
	ApplicationID string    `json:"application_id"`
	ServiceKey    string    `json:"service_key"`
	Enabled       bool      `json:"enabled"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func openRepository(ctx context.Context, databaseURL string) (*repository, error) {
	db, err := sql.Open("postgres", organisationSchemaURL(databaseURL))
	if err != nil {
		return nil, err
	}
	db.SetMaxIdleConns(3)
	db.SetMaxOpenConns(3)
	pingCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &repository{db: db}, nil
}

func organisationSchemaURL(databaseURL string) string {
	parsed, err := url.Parse(databaseURL)
	if err != nil {
		return databaseURL
	}
	query := parsed.Query()
	if query.Get("options") == "" {
		query.Set("options", "-c search_path=organisation,public")
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func (r *repository) close() error {
	if r == nil || r.db == nil {
		return nil
	}
	return r.db.Close()
}

func (r *repository) ready(ctx context.Context) error {
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return r.db.PingContext(pingCtx)
}

func (r *repository) getOrganisation(ctx context.Context, organisationID string) (Organisation, error) {
	var organisation Organisation
	err := r.db.QueryRowContext(ctx, `
		SELECT id, name, slug, status, created_at, updated_at
		FROM organisations
		WHERE id = $1
	`, organisationID).Scan(
		&organisation.ID,
		&organisation.Name,
		&organisation.Slug,
		&organisation.Status,
		&organisation.CreatedAt,
		&organisation.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Organisation{}, errNotFound
	}
	return organisation, err
}

func (r *repository) listOrganisations(ctx context.Context) ([]Organisation, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, slug, status, created_at, updated_at
		FROM organisations
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	organisations := make([]Organisation, 0)
	for rows.Next() {
		var organisation Organisation
		if err := rows.Scan(&organisation.ID, &organisation.Name, &organisation.Slug, &organisation.Status, &organisation.CreatedAt, &organisation.UpdatedAt); err != nil {
			return nil, err
		}
		organisations = append(organisations, organisation)
	}
	return organisations, rows.Err()
}

func (r *repository) getApplication(ctx context.Context, applicationID string) (Application, error) {
	var application Application
	err := r.db.QueryRowContext(ctx, `
		SELECT id, organisation_id, name, slug, status, created_at, updated_at
		FROM applications
		WHERE id = $1
	`, applicationID).Scan(
		&application.ID,
		&application.OrganisationID,
		&application.Name,
		&application.Slug,
		&application.Status,
		&application.CreatedAt,
		&application.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Application{}, errNotFound
	}
	return application, err
}

func (r *repository) listApplications(ctx context.Context) ([]Application, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, organisation_id, name, slug, status, created_at, updated_at
		FROM applications
		ORDER BY name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applications := make([]Application, 0)
	for rows.Next() {
		var application Application
		if err := rows.Scan(&application.ID, &application.OrganisationID, &application.Name, &application.Slug, &application.Status, &application.CreatedAt, &application.UpdatedAt); err != nil {
			return nil, err
		}
		applications = append(applications, application)
	}
	return applications, rows.Err()
}

func (r *repository) listApplicationServices(ctx context.Context, applicationID string) ([]ApplicationService, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT application_id, service_key, enabled, created_at, updated_at
		FROM application_services
		WHERE application_id = $1
		ORDER BY service_key ASC
	`, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	services := make([]ApplicationService, 0)
	for rows.Next() {
		var service ApplicationService
		if err := rows.Scan(&service.ApplicationID, &service.ServiceKey, &service.Enabled, &service.CreatedAt, &service.UpdatedAt); err != nil {
			return nil, err
		}
		services = append(services, service)
	}
	return services, rows.Err()
}
