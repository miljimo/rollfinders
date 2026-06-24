package endpoints

import (
	"errors"
	"net/http"

	"rollfinders/internal/services/academy/dataaccess"
)

func (s *server) writeDataError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, dataaccess.ErrNotFound):
		writeError(w, r, http.StatusNotFound, "not_found", "Academy resource was not found.", nil)
	case errors.Is(err, dataaccess.ErrConflict):
		writeError(w, r, http.StatusConflict, "conflict", "Academy request conflicts with an existing resource.", nil)
	default:
		s.logger.Error("academy data error", "request_id", requestIDFrom(r), "error", err)
		writeError(w, r, http.StatusInternalServerError, "internal_error", "Academy request could not be completed.", nil)
	}
}
