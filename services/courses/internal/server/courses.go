package server

import (
	"net/http"

	"courses/internal/dataaccess"
	"courses/internal/handlers"
)

type courseRequest struct {
	ID              string `json:"id,omitempty"`
	OrganisationID  string `json:"organisation_id"`
	CourseTypeID    string `json:"course_type_id"`
	Title           string `json:"title"`
	Description     string `json:"description,omitempty"`
	Level           string `json:"level,omitempty"`
	Capacity        int    `json:"capacity,omitempty"`
	Status          string `json:"status,omitempty"`
	CreatedByUserID string `json:"created_by_user_id,omitempty"`
}

func (s *server) createCourse(w http.ResponseWriter, r *http.Request) {
	s.saveCourse(w, r, "")
}

func (s *server) updateCourse(w http.ResponseWriter, r *http.Request) {
	s.saveCourse(w, r, handlers.Param(r, "id"))
}

func (s *server) saveCourse(w http.ResponseWriter, r *http.Request, pathID string) {
	if !s.requireDB(w) {
		return
	}
	var req courseRequest
	if err := handlers.Json(r, &req); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := validateRequired(map[string]string{"organisation_id": req.OrganisationID, "course_type_id": req.CourseTypeID, "title": req.Title}); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	id := firstNonEmpty(pathID, req.ID, newUUID())
	course := dataaccess.Course{
		ID:              id,
		OrganisationID:  req.OrganisationID,
		CourseTypeID:    req.CourseTypeID,
		Title:           req.Title,
		Description:     req.Description,
		Level:           req.Level,
		Capacity:        req.Capacity,
		Status:          firstNonEmpty(req.Status, "ACTIVE"),
		CreatedByUserID: req.CreatedByUserID,
	}
	if err := dataaccess.UpsertCourse(r.Context(), s.db, course); err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_save_failed", err.Error())
		return
	}
	item, ok, err := dataaccess.GetCourse(r.Context(), s.db, id)
	if err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_fetch_failed", err.Error())
		return
	}
	if !ok {
		handlers.WriteError(w, http.StatusInternalServerError, "course_missing", "Course was saved but could not be read back.")
		return
	}
	if pathID == "" {
		handlers.WriteCreated(w, item)
		return
	}
	handlers.WriteOK(w, item)
}

func (s *server) getCourse(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	item, ok, err := dataaccess.GetCourse(r.Context(), s.db, handlers.Param(r, "id"))
	if err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_fetch_failed", err.Error())
		return
	}
	if !ok {
		handlers.WriteError(w, http.StatusNotFound, "not_found", "Course was not found.")
		return
	}
	handlers.WriteOK(w, item)
}

func (s *server) listCourses(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	organisationID := handlers.Query(r, "organisation_id")
	if organisationID == "" {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", "organisation_id query parameter is required.")
		return
	}
	items, err := dataaccess.ListCourses(r.Context(), s.db, organisationID)
	if err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_list_failed", err.Error())
		return
	}
	handlers.WriteOK(w, map[string]interface{}{"items": items})
}

func (s *server) deleteCourse(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	if err := dataaccess.DeleteCourse(r.Context(), s.db, handlers.Param(r, "id")); err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "course_delete_failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
