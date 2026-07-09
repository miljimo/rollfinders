package server

import (
	"context"
	"encoding/json"
	"rollfinders/internal/core/generators"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Ready(ctx context.Context) error {
	return r.db.Ping(ctx)
}

func (r *Repository) Track(ctx context.Context, id string, req TrackEventRequest) error {
	metadata := req.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	if req.CourseID != "" {
		metadata["courseId"] = req.CourseID
	}
	if req.CourseType != "" {
		metadata["courseType"] = req.CourseType
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if req.VisitorID != "" {
		_, err = tx.Exec(ctx, `
INSERT INTO analytics.visitors (visitor_id, last_session_id, ip_hash, last_seen_at, session_seen_at, metadata)
VALUES ($1, NULLIF($2,''), NULLIF($3,''), now(), now(), '{}'::jsonb)
ON CONFLICT (visitor_id) DO UPDATE SET
  last_session_id = EXCLUDED.last_session_id,
  ip_hash = COALESCE(analytics.visitors.ip_hash, EXCLUDED.ip_hash),
  last_seen_at = now(),
  session_seen_at = now()`, req.VisitorID, req.SessionID, req.IPHash)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(ctx, `
INSERT INTO analytics.events (
  id, event_name, visitor_id, session_id, ip_hash, academy_id, open_mat_id, country_code, country_name, source, metadata
) VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),NULLIF($9,''),$10,$11::jsonb)`,
		id, req.EventName, req.VisitorID, req.SessionID, req.IPHash, req.AcademyID, req.OpenMatID, req.CountryCode, req.CountryName, firstNonEmpty(req.Source, "analytics_api"), string(metadataJSON))
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) Aggregate(ctx context.Context, metricDate string) ([]DailyMetric, error) {
	metrics := []struct {
		name      string
		expr      string
		predicate string
	}{
		{"unique_visitors", "COUNT(DISTINCT visitor_id)", "visitor_id IS NOT NULL"},
		{"unique_sessions", "COUNT(DISTINCT session_id)", "session_id IS NOT NULL"},
		{"academy_searches", "COUNT(*)", "event_name = 'academy_search_submitted'"},
		{"open_mat_searches", "COUNT(*)", "event_name = 'open_mat_search_submitted'"},
		{"course_searches", "COUNT(*)", "event_name = 'course_search_submitted'"},
		{"academy_profile_views", "COUNT(*)", "event_name = 'academy_profile_viewed'"},
		{"open_mat_views", "COUNT(*)", "event_name = 'open_mat_viewed'"},
		{"course_views", "COUNT(*)", "event_name = 'course_viewed'"},
		{"commercial_intent_clicks", "COUNT(*)", "event_name = 'commercial_intent_clicked'"},
		{"claim_starts", "COUNT(*)", "event_name = 'claim_profile_started'"},
		{"claim_submissions", "COUNT(*)", "event_name = 'claim_profile_submitted'"},
		{"claims_approved", "COUNT(*)", "event_name = 'claim_approved'"},
		{"claims_rejected", "COUNT(*)", "event_name = 'claim_rejected'"},
		{"user_logins", "COUNT(*)", "event_name = 'user_logged_in'"},
		{"logged_in_users", "COUNT(DISTINCT COALESCE(NULLIF(metadata->>'userId',''), NULLIF(visitor_id,''), NULLIF(session_id,'')))", "event_name = 'user_logged_in'"},
		{"academies_created", "COUNT(*)", "event_name = 'academy_created'"},
		{"open_mats_created", "COUNT(*)", "event_name = 'open_mat_created'"},
		{"courses_created", "COUNT(*)", "event_name = 'course_created'"},
		{"recurring_courses_created", "COUNT(*)", "event_name = 'recurring_course_created'"},
	}
	results := make([]DailyMetric, 0, len(metrics))
	for _, metric := range metrics {
		query := "SELECT " + metric.expr + " AS value FROM analytics.events WHERE created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day') AND " + metric.predicate
		var value int
		if err := r.db.QueryRow(ctx, query, metricDate).Scan(&value); err != nil {
			return results, err
		}
		_, err := r.db.Exec(ctx, `
INSERT INTO analytics.daily_metrics (id, metric_name, value, metric_date, dimension_key, dimensions, updated_at)
VALUES ($1, $2, $3, $4::date, 'global', '{}'::jsonb, now())
ON CONFLICT (metric_date, metric_name, dimension_key)
DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, generators.CreateNewId("", 12), metric.name, value, metricDate)
		if err != nil {
			return results, err
		}
		results = append(results, DailyMetric{MetricName: metric.name, MetricValue: value, MetricDate: metricDate, Metadata: map[string]any{}})
	}
	return results, nil
}

func (r *Repository) FounderSummary(ctx context.Context, days int) (FounderSummaryResponse, error) {
	var response FounderSummaryResponse
	response.Days = days
	response.Trends = []DailyMetric{}
	response.Countries = []CountrySignal{}
	response.DailyVisits = []DailyVisit{}
	response.LoggedIn = LoggedInUsers{ActiveWindowMinutes: 30, ByRole: []LoggedInRoleCount{}}
	rows, err := r.db.Query(ctx, `
SELECT metric_name, value, metric_date
FROM analytics.daily_metrics
WHERE metric_date >= (CURRENT_DATE - ($1::int - 1))
ORDER BY metric_date ASC, metric_name ASC`, days)
	if err != nil {
		return response, err
	}
	defer rows.Close()
	for rows.Next() {
		var metric DailyMetric
		var metricDate time.Time
		if err := rows.Scan(&metric.MetricName, &metric.MetricValue, &metricDate); err != nil {
			return response, err
		}
		metric.MetricDate = metricDate.Format("2006-01-02")
		metric.Metadata = map[string]any{}
		response.Trends = append(response.Trends, metric)
		addMetric(&response.Summary, metric.MetricName, metric.MetricValue)
	}
	if err := rows.Err(); err != nil {
		return response, err
	}
	rawRows, err := r.db.Query(ctx, `
SELECT event_name, COUNT(*)::int AS value
FROM analytics.events
WHERE created_at >= (CURRENT_DATE - ($1::int - 1))
GROUP BY event_name`, days)
	if err != nil {
		return response, err
	}
	defer rawRows.Close()
	for rawRows.Next() {
		var name string
		var value int
		if err := rawRows.Scan(&name, &value); err != nil {
			return response, err
		}
		maxMetric(&response.Summary, name, value)
	}
	if err := r.db.QueryRow(ctx, `
SELECT COUNT(DISTINCT visitor_id)::int, COUNT(DISTINCT session_id)::int
FROM analytics.events
WHERE created_at >= (CURRENT_DATE - ($1::int - 1))`, days).Scan(&response.Summary.Visitor.UniqueVisitors, &response.Summary.Visitor.UniqueSessions); err != nil {
		return response, err
	}
	anonymous := response.Summary.Search.AcademySearches + response.Summary.Search.OpenMatSearches + response.Summary.Search.CourseSearches + response.Summary.Profile.AcademyProfileViews + response.Summary.Profile.OpenMatViews + response.Summary.Profile.CourseViews
	response.Summary.Marketplace.VisitorCount = max(response.Summary.Visitor.UniqueVisitors, anonymous)
	response.Summary.Marketplace.SessionCount = max(response.Summary.Visitor.UniqueSessions, response.Summary.Marketplace.VisitorCount)
	countries, err := r.db.Query(ctx, `
SELECT country_code, COALESCE(country_name, 'Unknown'), COUNT(*)::int, COUNT(DISTINCT visitor_id)::int
FROM analytics.events
WHERE created_at >= (CURRENT_DATE - ($1::int - 1))
GROUP BY country_code, country_name
ORDER BY COUNT(*) DESC, COALESCE(country_name, 'Unknown') ASC
LIMIT 8`, days)
	if err != nil {
		return response, err
	}
	defer countries.Close()
	for countries.Next() {
		var country CountrySignal
		if err := countries.Scan(&country.CountryCode, &country.CountryName, &country.EventCount, &country.VisitorCount); err != nil {
			return response, err
		}
		response.Countries = append(response.Countries, country)
	}
	visits, err := r.db.Query(ctx, `
SELECT created_at::date, COUNT(DISTINCT visitor_id)::int, COUNT(DISTINCT session_id)::int, COUNT(*)::int
FROM analytics.events
WHERE created_at >= (CURRENT_DATE - ($1::int - 1))
GROUP BY created_at::date
ORDER BY created_at::date DESC`, days)
	if err != nil {
		return response, err
	}
	defer visits.Close()
	for visits.Next() {
		var visit DailyVisit
		var date time.Time
		if err := visits.Scan(&date, &visit.UniqueVisitors, &visit.UniqueSessions, &visit.EventCount); err != nil {
			return response, err
		}
		visit.Date = date.Format("2006-01-02")
		response.DailyVisits = append(response.DailyVisits, visit)
	}
	if err := r.loadLoggedInUsers(ctx, &response); err != nil {
		return response, err
	}
	return response, nil
}

func (r *Repository) loadLoggedInUsers(ctx context.Context, response *FounderSummaryResponse) error {
	const actorExpr = "COALESCE(NULLIF(metadata->>'userId',''), NULLIF(visitor_id,''), NULLIF(session_id,''))"
	const activeWindowMinutes = 30
	response.LoggedIn.ActiveWindowMinutes = activeWindowMinutes
	response.LoggedIn.ByRole = []LoggedInRoleCount{}
	if err := r.db.QueryRow(ctx, `
SELECT
  COUNT(DISTINCT CASE WHEN created_at >= (now() - ($1::int * INTERVAL '1 minute')) THEN `+actorExpr+` END)::int,
  COUNT(DISTINCT CASE WHEN created_at >= CURRENT_DATE THEN `+actorExpr+` END)::int,
  COUNT(DISTINCT CASE WHEN created_at >= (now() - INTERVAL '7 days') THEN `+actorExpr+` END)::int
FROM analytics.events
WHERE event_name = 'user_logged_in'
  AND `+actorExpr+` IS NOT NULL`, activeWindowMinutes).Scan(
		&response.LoggedIn.CurrentCount,
		&response.LoggedIn.LoggedInTodayCount,
		&response.LoggedIn.LoggedInSevenDayCount,
	); err != nil {
		return err
	}
	rows, err := r.db.Query(ctx, `
SELECT COALESCE(NULLIF(metadata->>'role',''), 'unknown') AS role, COUNT(DISTINCT `+actorExpr+`)::int AS current_count
FROM analytics.events
WHERE event_name = 'user_logged_in'
  AND created_at >= (now() - ($1::int * INTERVAL '1 minute'))
  AND `+actorExpr+` IS NOT NULL
GROUP BY COALESCE(NULLIF(metadata->>'role',''), 'unknown')
ORDER BY current_count DESC, role ASC`, activeWindowMinutes)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var count LoggedInRoleCount
		if err := rows.Scan(&count.Role, &count.CurrentCount); err != nil {
			return err
		}
		response.LoggedIn.ByRole = append(response.LoggedIn.ByRole, count)
	}
	return rows.Err()
}

func (r *Repository) AcademyProfileViewCount(ctx context.Context, academyID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
SELECT COUNT(*)::int
FROM analytics.events
WHERE academy_id = $1 AND event_name = 'academy_profile_viewed'`, academyID).Scan(&count)
	return count, err
}

func addMetric(summary *Summary, name string, value int) {
	switch name {
	case "unique_visitors":
		summary.Visitor.UniqueVisitors += value
	case "unique_sessions":
		summary.Visitor.UniqueSessions += value
	case "academy_searches":
		summary.Search.AcademySearches += value
	case "open_mat_searches":
		summary.Search.OpenMatSearches += value
	case "course_searches":
		summary.Search.CourseSearches += value
	case "academy_profile_views":
		summary.Profile.AcademyProfileViews += value
	case "open_mat_views":
		summary.Profile.OpenMatViews += value
	case "course_views":
		summary.Profile.CourseViews += value
	case "commercial_intent_clicks":
		summary.Commercial.CommercialIntentClicks += value
	case "claim_starts":
		summary.Claim.ClaimStarts += value
	case "claim_submissions":
		summary.Claim.ClaimSubmissions += value
	case "claims_approved":
		summary.Claim.ClaimsApproved += value
	case "claims_rejected":
		summary.Claim.ClaimsRejected += value
	case "academies_created":
		summary.Supply.AcademiesCreated += value
	case "open_mats_created":
		summary.Supply.OpenMatsCreated += value
	case "courses_created":
		summary.Supply.CoursesCreated += value
	case "recurring_courses_created":
		summary.Supply.RecurringCoursesCreated += value
	}
}

func maxMetric(summary *Summary, eventName string, value int) {
	switch eventName {
	case "academy_search_submitted":
		summary.Search.AcademySearches = max(summary.Search.AcademySearches, value)
	case "open_mat_search_submitted":
		summary.Search.OpenMatSearches = max(summary.Search.OpenMatSearches, value)
	case "course_search_submitted":
		summary.Search.CourseSearches = max(summary.Search.CourseSearches, value)
	case "academy_profile_viewed":
		summary.Profile.AcademyProfileViews = max(summary.Profile.AcademyProfileViews, value)
	case "open_mat_viewed":
		summary.Profile.OpenMatViews = max(summary.Profile.OpenMatViews, value)
	case "course_viewed":
		summary.Profile.CourseViews = max(summary.Profile.CourseViews, value)
	case "commercial_intent_clicked":
		summary.Commercial.CommercialIntentClicks = max(summary.Commercial.CommercialIntentClicks, value)
	case "claim_profile_started":
		summary.Claim.ClaimStarts = max(summary.Claim.ClaimStarts, value)
	case "claim_profile_submitted":
		summary.Claim.ClaimSubmissions = max(summary.Claim.ClaimSubmissions, value)
	case "claim_approved":
		summary.Claim.ClaimsApproved = max(summary.Claim.ClaimsApproved, value)
	case "claim_rejected":
		summary.Claim.ClaimsRejected = max(summary.Claim.ClaimsRejected, value)
	case "academy_created":
		summary.Supply.AcademiesCreated = max(summary.Supply.AcademiesCreated, value)
	case "open_mat_created":
		summary.Supply.OpenMatsCreated = max(summary.Supply.OpenMatsCreated, value)
	case "course_created":
		summary.Supply.CoursesCreated = max(summary.Supply.CoursesCreated, value)
	case "recurring_course_created":
		summary.Supply.RecurringCoursesCreated = max(summary.Supply.RecurringCoursesCreated, value)
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
