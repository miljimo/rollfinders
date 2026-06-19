package server

import (
	"net/http"

	"courses/internal/dataaccess"
	"courses/internal/handlers"
)

type activityRequest struct {
	ID                 string `json:"id,omitempty"`
	Title              string `json:"title"`
	Description        string `json:"description,omitempty"`
	StartOffsetMinutes int    `json:"start_offset_minutes"`
	DurationMinutes    int    `json:"duration_minutes"`
	SortOrder          int    `json:"sort_order"`
}

func (s *server) createActivity(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	var req activityRequest
	if err := handlers.Json(r, &req); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := validateRequired(map[string]string{"title": req.Title}); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.DurationMinutes <= 0 {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", "duration_minutes must be greater than zero.")
		return
	}
	activity := dataaccess.Activity{
		ID:                 firstNonEmpty(req.ID, newUUID()),
		CourseID:           handlers.Param(r, "id"),
		Title:              req.Title,
		Description:        req.Description,
		StartOffsetMinutes: req.StartOffsetMinutes,
		DurationMinutes:    req.DurationMinutes,
		SortOrder:          req.SortOrder,
	}
	if err := dataaccess.UpsertActivity(r.Context(), s.db, activity); err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "activity_save_failed", err.Error())
		return
	}
	handlers.WriteCreated(w, activity)
}

func (s *server) updateActivity(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	var req struct {
		CourseID string `json:"course_id"`
		activityRequest
	}
	if err := handlers.Json(r, &req); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := validateRequired(map[string]string{"course_id": req.CourseID, "title": req.Title}); err != nil {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if req.DurationMinutes <= 0 {
		handlers.WriteError(w, http.StatusBadRequest, "invalid_request", "duration_minutes must be greater than zero.")
		return
	}
	activity := dataaccess.Activity{
		ID:                 handlers.Param(r, "id"),
		CourseID:           req.CourseID,
		Title:              req.Title,
		Description:        req.Description,
		StartOffsetMinutes: req.StartOffsetMinutes,
		DurationMinutes:    req.DurationMinutes,
		SortOrder:          req.SortOrder,
	}
	if err := dataaccess.UpsertActivity(r.Context(), s.db, activity); err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "activity_save_failed", err.Error())
		return
	}
	handlers.WriteOK(w, activity)
}

func (s *server) listActivities(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	items, err := dataaccess.ListActivities(r.Context(), s.db, handlers.Param(r, "id"))
	if err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "activity_list_failed", err.Error())
		return
	}
	handlers.WriteOK(w, map[string]interface{}{"items": items})
}

func (s *server) deleteActivity(w http.ResponseWriter, r *http.Request) {
	if !s.requireDB(w) {
		return
	}
	if err := dataaccess.DeleteActivity(r.Context(), s.db, handlers.Param(r, "id")); err != nil {
		handlers.WriteError(w, http.StatusInternalServerError, "activity_delete_failed", err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
