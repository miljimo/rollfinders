package server

import (
	"context"
	"database/sql"
	"net/http"
	"sync"
	"time"

	_ "github.com/lib/pq"
)

type dependencyResult struct {
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

type dependencyReport struct {
	Status   string                      `json:"status"`
	Services map[string]dependencyResult `json:"services"`
}

func (s *server) dependencyReport(ctx context.Context) dependencyReport {
	checks := map[string]string{
		"users":         s.cfg.UserBaseURL,
		"authorisation": s.cfg.AuthorisationBaseURL,
		"academy":       s.cfg.AcademyBaseURL,
		"organisation":  s.cfg.OrganisationBaseURL,
		"courses":       s.cfg.CourseBaseURL,
		"booking":       s.cfg.BookingBaseURL,
		"payments":      s.cfg.PaymentBaseURL,
		"wallet":        s.cfg.WalletBaseURL,
		"transfer":      s.cfg.TransferBaseURL,
		"pricing":       s.cfg.PricingBaseURL,
	}

	results := make(map[string]dependencyResult, len(checks)+1)
	var mu sync.Mutex
	var wg sync.WaitGroup
	client := &http.Client{Timeout: 2 * time.Second}

	for name, baseURL := range checks {
		wg.Add(1)
		go func(name, baseURL string) {
			defer wg.Done()
			result := checkHTTPHealth(ctx, client, baseURL+"/healthz")
			mu.Lock()
			results[name] = result
			mu.Unlock()
		}(name, baseURL)
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		result := s.checkDatabase(ctx)
		mu.Lock()
		results["database"] = result
		mu.Unlock()
	}()

	wg.Wait()

	report := dependencyReport{Status: "ready", Services: results}
	for _, result := range results {
		if result.Status != "ready" {
			report.Status = "not_ready"
			break
		}
	}
	return report
}

func checkHTTPHealth(ctx context.Context, client *http.Client, healthURL string) dependencyResult {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
	if err != nil {
		return dependencyResult{Status: "not_ready", Reason: "invalid health URL"}
	}
	resp, err := client.Do(req)
	if err != nil {
		return dependencyResult{Status: "not_ready", Reason: "unreachable"}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return dependencyResult{Status: "ready"}
	}
	return dependencyResult{Status: "not_ready", Reason: resp.Status}
}

func (s *server) checkDatabase(ctx context.Context) dependencyResult {
	if s.cfg.DatabaseURL == "" {
		return dependencyResult{Status: "not_ready", Reason: "database URL is not configured"}
	}
	db, err := sql.Open("postgres", s.cfg.DatabaseURL)
	if err != nil {
		return dependencyResult{Status: "not_ready", Reason: "database URL is invalid"}
	}
	defer db.Close()
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		return dependencyResult{Status: "not_ready", Reason: "database is unreachable"}
	}
	return dependencyResult{Status: "ready"}
}
