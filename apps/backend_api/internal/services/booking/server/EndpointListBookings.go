package server

import (
	"net/http"
	"strconv"

	"rollfinders/internal/services/booking/dataaccess"
)

func (s *server) listBookings(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()
	limit, _ := strconv.Atoi(params.Get("limit"))
	if limit == 0 {
		limit, _ = strconv.Atoi(params.Get("page_size"))
	}
	offset, _ := strconv.Atoi(params.Get("offset"))
	db, ok := s.withDataContext(w, r)
	if !ok {
		return
	}
	defer db.Close()
	list, err := dataaccess.ListBookings(r.Context(), db, dataaccess.ListBookingsFilter{
		CustomerID:         params.Get("customer_id"),
		GuestReference:     params.Get("guest_reference"),
		OrganisationID:     params.Get("organisation_id"),
		BookableType:       params.Get("bookable_type"),
		BookableID:         params.Get("bookable_id"),
		BookableInstanceID: params.Get("bookable_instance_id"),
		PaymentID:          params.Get("payment_id"),
		Status:             params.Get("status"),
		Limit:              limit,
		Offset:             offset,
	})
	if err != nil {
		s.writeDataError(w, r, err)
		return
	}
	list.Pagination = pagination(limit, offset, len(list.Items))
	writeJSON(w, http.StatusOK, list)
}
