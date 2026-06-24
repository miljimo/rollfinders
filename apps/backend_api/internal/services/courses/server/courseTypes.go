package server

import (
	"net/http"
	"strings"
	"unicode"

	"rollfinders/internal/services/courses/dataaccess"
	"rollfinders/internal/services/courses/handlers"
)

type courseTypeRequest struct {
	ID             string `json:"id,omitempty"`
	OrganisationID string `json:"organisation_id"`
	Name           string `json:"name"`
	Description    string `json:"description,omitempty"`
	IsDefault      bool   `json:"is_default,omitempty"`
}

func (s *server) createCourseType(w http.ResponseWriter, r *http.Request) {
	s.saveCourseType(w, r, "")
}

func (s *server) updateCourseType(w http.ResponseWriter, r *http.Request) {
	s.saveCourseType(w, r, handlers.Param(r, "id"))
}

func (s *server) saveCourseType(w http.ResponseWriter, r *http.Request, pathID string) {
	if !s.requireDB(w) {
		return
	}
	var req courseTypeRequest
	if err := handlers.Json(r, &req); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := validateRequired(map[string]string{"name": req.Name}); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	id := firstNonEmpty(pathID, platformCourseTypeID(req.Name), req.ID, newUUID())
	if err := dataaccess.CreateCourseType(r.Context(), s.db, id, req.OrganisationID, req.Name, req.Description, req.IsDefault); err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_type_save_failed", err.Error())
		return
	}
	item, ok, err := dataaccess.GetCourseType(r.Context(), s.db, id)
	if err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_type_fetch_failed", err.Error())
		return
	}
	if !ok {
		handlers.WriteError(w, http.StatusInternalServerError, "course_type_missing", "Course type was saved but could not be read back.")
		return
	}
	if pathID == "" {
		handlers.WriteCreated(w, item)
		return
	}
	handlers.WriteOK(w, item)
}

func platformCourseTypeID(name string) string {
	var builder strings.Builder
	lastUnderscore := false
	for _, char := range strings.ToLower(strings.TrimSpace(name)) {
		if unicode.IsLetter(char) || unicode.IsDigit(char) {
			builder.WriteRune(char)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			builder.WriteByte('_')
			lastUnderscore = true
		}
	}
	value := strings.Trim(builder.String(), "_")
	if value == "" {
		return ""
	}
	return "platform_" + value
}

func (s *server) getCourseType(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	item, ok, err := dataaccess.GetCourseType(r.Context(), s.db, handlers.Param(r, "id"))
	if err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_type_fetch_failed", err.Error())
		return
	}
	if !ok {
		handlers.WriteError(w, http.StatusNotFound, "not_found", "Course type was not found.")
		return
	}
	handlers.WriteOK(w, item)
}

func (s *server) listCourseTypes(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	organisationID := handlers.Query(r, "organisation_id")
	limit := handlers.PageLimit(handlers.IntQuery(r, "limit", handlers.DefaultPageSize))
	offset := handlers.PageOffset(handlers.IntQuery(r, "offset", 0))
	items, err := dataaccess.ListCourseTypes(
		r.Context(),
		s.db,
		organisationID,
		limit,
		offset,
	)
	if err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_type_list_failed", err.Error())
		return
	}
	handlers.WriteOK(w, map[string]interface{}{"items": items, "pagination": handlers.Pagination(limit, offset, len(items))})
}

func (s *server) deleteCourseType(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	if err := dataaccess.DeleteCourseType(r.Context(), s.db, handlers.Param(r, "id")); err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_type_delete_failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
