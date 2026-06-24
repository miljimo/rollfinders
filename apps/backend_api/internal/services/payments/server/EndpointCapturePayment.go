package server

import "net/http"

func (s *server) capturePayment(w http.ResponseWriter, r *http.Request) {
	s.paymentAction(w, r, "capture", func(adapter providerAdapter, p Payment, key string) (providerResult, error) {
		return adapter.Capture(p, key)
	})
}
