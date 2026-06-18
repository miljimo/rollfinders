package server

import "net/http"

func (s *server) cancelPayment(w http.ResponseWriter, r *http.Request) {
	s.paymentAction(w, r, "cancel", func(adapter providerAdapter, p Payment, key string) (providerResult, error) {
		return adapter.Cancel(p, key)
	})
}
