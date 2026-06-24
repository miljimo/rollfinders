package server

import (
	"errors"
	"net/http"
)

func (s *server) requireRepository(w http.ResponseWriter, r *http.Request) bool {
	if s.repo != nil {
		return true
	}
	writeError(w, r, http.StatusServiceUnavailable, "not_ready", "Organisation database is not available.")
	return false
}

func (s *server) getOrganisation(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}

	organisation, err := s.repo.getOrganisation(r.Context(), r.PathValue("organisation_id"))
	if errors.Is(err, errNotFound) {
		writeError(w, r, http.StatusNotFound, "organisation_not_found", "Organisation was not found.")
		return
	}
	if err != nil {
		s.logger.Error("organisation lookup failed", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "organisation_lookup_failed", "Organisation lookup failed.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"organisation": organisation})
}

func (s *server) listOrganisations(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}

	limit := intQuery(r, "limit", 10)
	offset := intQuery(r, "offset", 0)
	organisations, err := s.repo.listOrganisations(r.Context(), limit, offset)
	if err != nil {
		s.logger.Error("organisations lookup failed", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "organisations_lookup_failed", "Organisations lookup failed.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"organisations": organisations, "pagination": pagination(limit, offset, len(organisations))})
}

func (s *server) getApplication(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}

	application, err := s.repo.getApplication(r.Context(), r.PathValue("application_id"))
	if errors.Is(err, errNotFound) {
		writeError(w, r, http.StatusNotFound, "application_not_found", "Application was not found.")
		return
	}
	if err != nil {
		s.logger.Error("application lookup failed", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "application_lookup_failed", "Application lookup failed.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"application": application})
}

func (s *server) listApplications(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}

	limit := intQuery(r, "limit", 10)
	offset := intQuery(r, "offset", 0)
	applications, err := s.repo.listApplications(r.Context(), limit, offset)
	if err != nil {
		s.logger.Error("applications lookup failed", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "applications_lookup_failed", "Applications lookup failed.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"applications": applications, "pagination": pagination(limit, offset, len(applications))})
}

func (s *server) listApplicationServices(w http.ResponseWriter, r *http.Request) {
	if !s.requireRepository(w, r) {
		return
	}

	applicationID := r.PathValue("application_id")
	if _, err := s.repo.getApplication(r.Context(), applicationID); errors.Is(err, errNotFound) {
		writeError(w, r, http.StatusNotFound, "application_not_found", "Application was not found.")
		return
	} else if err != nil {
		s.logger.Error("application lookup failed", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "application_lookup_failed", "Application lookup failed.")
		return
	}

	limit := intQuery(r, "limit", 10)
	offset := intQuery(r, "offset", 0)
	services, err := s.repo.listApplicationServices(r.Context(), applicationID, limit, offset)
	if err != nil {
		s.logger.Error("application services lookup failed", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "application_services_lookup_failed", "Application services lookup failed.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"services": services, "pagination": pagination(limit, offset, len(services))})
}
