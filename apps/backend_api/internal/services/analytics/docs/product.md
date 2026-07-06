# PRD: RollFinders Analytics Service

## 1. Objective

Build a dedicated Analytics Service for RollFinders that tracks how users interact with the application.

The service must provide insights into:

* Page visits
* Clicks
* Academy searches
* Academy profile views
* Login activity
* Unique visitors
* Average time spent
* User journeys
* Popular academies
* Popular search locations
* Conversion behaviour from search to profile to booking

The service must be written in **Go**, using **SOLID principles**, **clean architecture**, and **clean coding practices**.

---

## 2. Service Scope

The Analytics Service is responsible for collecting, storing, and reporting user behaviour data.

It should not directly own academy, booking, user, payment, or course logic.

It should only receive events from the frontend, backend services, or orchestration layer and store analytics data for reporting.

---

## 3. Key Analytics Events

The service should track the following events:

### Page Visits

Track when a user visits a page.

Examples:

* Home page
* Academy listing page
* Academy profile page
* Booking page
* Login page
* Register page
* Course details page
* Dashboard page

### Click Events

Track important button or link clicks.

Examples:

* Search button clicked
* Academy profile clicked
* Book course clicked
* Login clicked
* Register clicked
* Claim academy clicked
* Payment button clicked
* Contact academy clicked

### Academy Search

Track search behaviour.

Data to capture:

* Search keyword
* City
* Country
* Filters used
* Result count
* Search timestamp
* Visitor ID
* User ID if logged in

### Academy Profile Views

Track academy profile visits.

Data to capture:

* Academy ID
* Visitor ID
* User ID if logged in
* Referrer page
* Time viewed
* Country
* Device type

### Login Activity

Track login behaviour.

Data to capture:

* Login success
* Login failure
* User ID
* Email hash if needed
* IP address
* Country
* Device type
* Failure reason where safe

### Average Time Spent

Track how long users spend on:

* Pages
* Academy profiles
* Search result pages
* Booking pages
* Course detail pages

Frontend should send a `page_exit` or `session_update` event to calculate duration.

### Unique Visits

Track unique users using:

* `visitor_id` for anonymous users
* `user_id` for logged-in users
* IP address only as supporting metadata, not primary identity

---

## 4. Core Requirements

### Functional Requirements

The service must allow the application to:

1. Record analytics events.
2. Track anonymous and logged-in users.
3. Track page views.
4. Track clicks.
5. Track academy searches.
6. Track academy profile views.
7. Track login activity.
8. Track user session duration.
9. Calculate unique visits.
10. Generate reports for admin dashboards.
11. Filter reports by date range.
12. Filter reports by academy.
13. Filter reports by country.
14. Filter reports by device type.
15. Provide aggregated metrics for frontend dashboards.

---

## 5. Non-Functional Requirements

The service must be:

* Written in Go
* REST API based
* Cleanly structured
* Easy to test
* Easy to extend
* Independent from other services
* Safe for production use
* Designed with SOLID principles
* Designed using clean architecture
* Database-driven
* Observable through logs
* Secure against invalid analytics payloads

---

## 6. Architecture Rules

The service should follow clean architecture.

Recommended folder structure:

```txt
analytics-service/
  cmd/
    api/
      main.go

  internal/
    config/
      config.go

    domain/
      types.go
      errors.go

    handlers/
      page_visit_handler.go
      click_handler.go
      search_handler.go
      profile_handler.go
      login_handler.go
      session_handler.go
      report_handler.go

    apps/backend_api/
      analytics_service.go
      reporting_service.go

    repositories/
      analytics_repository.go
      postgres_analytics_repository.go

    middleware/
      auth_middleware.go
      request_logger.go

    routes/
      routes.go

    database/
      postgres.go
      migrations/

  pkg/
    logger/
      logger.go

  go.mod
```

---

## 7. File Rules

Each endpoint handler should be placed in its own file.

Examples:

```txt
page_visit_handler.go
click_handler.go
search_handler.go
profile_handler.go
login_handler.go
session_handler.go
report_handler.go
```

The file `types.go` must contain all shared request, response, enum, and domain types used by the service.

---

## 8. types.go Requirements

`types.go` should contain types such as:

```go
type AnalyticsEventType string

const (
    EventPageVisit       AnalyticsEventType = "page_visit"
    EventClick           AnalyticsEventType = "click"
    EventAcademySearch   AnalyticsEventType = "academy_search"
    EventProfileView     AnalyticsEventType = "profile_view"
    EventLogin           AnalyticsEventType = "login"
    EventSessionStart    AnalyticsEventType = "session_start"
    EventSessionEnd      AnalyticsEventType = "session_end"
)
```

It should also contain:

```go
type TrackPageVisitRequest struct {}
type TrackClickRequest struct {}
type TrackAcademySearchRequest struct {}
type TrackProfileViewRequest struct {}
type TrackLoginRequest struct {}
type TrackSessionRequest struct {}

type AnalyticsResponse struct {}
type AnalyticsReportResponse struct {}
type VisitorSummary struct {}
type PageVisitSummary struct {}
type AcademySearchSummary struct {}
type ProfileViewSummary struct {}
```

---

## 9. API Endpoints

### Page Visits

```http
POST /analytics/page-visit
```

Records a page visit.

### Clicks

```http
POST /analytics/click
```

Records a user click.

### Academy Search

```http
POST /analytics/academy-search
```

Records an academy search.

### Academy Profile View

```http
POST /analytics/profile-view
```

Records when an academy profile is viewed.

### Login Activity

```http
POST /analytics/login
```

Records login success or failure.

### Session Tracking

```http
POST /analytics/session/start
POST /analytics/session/end
POST /analytics/session/update
```

Tracks time spent in the application.

### Reports

```http
GET /analytics/reports/summary
GET /analytics/reports/page-visits
GET /analytics/reports/clicks
GET /analytics/reports/academy-searches
GET /analytics/reports/profile-views
GET /analytics/reports/logins
GET /analytics/reports/unique-visitors
GET /analytics/reports/average-time-spent
```

---

## 10. Database Tables

### analytics_events

Stores all raw analytics events.

Fields:

```txt
id
event_type
visitor_id
user_id
academy_id
page_url
page_name
element_id
element_name
search_query
country
city
ip_address
device_type
browser
os
metadata JSONB
created_at
```

### analytics_sessions

Stores user session data.

Fields:

```txt
id
session_id
visitor_id
user_id
started_at
ended_at
duration_seconds
ip_address
country
device_type
created_at
updated_at
```

### analytics_daily_summary

Stores pre-calculated daily metrics.

Fields:

```txt
id
summary_date
total_visits
unique_visitors
total_clicks
total_searches
total_profile_views
total_logins
average_time_spent_seconds
created_at
updated_at
```

---

## 11. Reporting Metrics

The service should support reports for:

* Total page visits
* Page visits by page
* Click count by element
* Search count by keyword
* Search count by city
* Search count by country
* Academy profile view count
* Most viewed academies
* Login success count
* Login failure count
* Unique visitors
* Returning visitors
* Average session duration
* Average page duration
* Conversion from search to profile view
* Conversion from profile view to booking

---

## 12. Security Requirements

* Validate all incoming requests.
* Do not store raw sensitive user data unnecessarily.
* Avoid storing plain email addresses in analytics events.
* Use user ID instead of email where possible.
* IP address should be used carefully and may be hashed if required.
* Admin report endpoints must require authorization.
* Public tracking endpoints should use rate limiting.
* Reject invalid event types.

---

## 13. SOLID Principles

The Go service must follow SOLID principles:

### Single Responsibility

Each handler should only handle HTTP request and response logic.

Business logic must live in service files.

Database logic must live in repository files.

### Open/Closed

New event types should be easy to add without rewriting existing handlers.

### Liskov Substitution

Repository interfaces should allow PostgreSQL implementations to be replaced later.

### Interface Segregation

Avoid large interfaces. Use small focused interfaces.

### Dependency Inversion

Handlers should depend on service interfaces, not concrete implementations.

Services should depend on repository interfaces, not database implementation details.

---

## 14. Clean Coding Rules

The implementation must:

* Use clear naming
* Avoid large functions
* Avoid duplicated logic
* Validate request payloads
* Return consistent JSON responses
* Use context.Context
* Use dependency injection
* Use structured logging
* Use repository interfaces
* Include unit tests
* Include integration tests where needed

---

## 15. Example JSON Payloads

### Page Visit

```json
{
  "visitor_id": "visitor_123",
  "user_id": "user_456",
  "page_url": "/academies",
  "page_name": "Academy Listing",
  "country": "Netherlands",
  "device_type": "mobile"
}
```

### Click

```json
{
  "visitor_id": "visitor_123",
  "user_id": "user_456",
  "page_url": "/academies",
  "element_id": "search_button",
  "element_name": "Search Button"
}
```

### Academy Search

```json
{
  "visitor_id": "visitor_123",
  "user_id": "user_456",
  "search_query": "BJJ Rotterdam",
  "city": "Rotterdam",
  "country": "Netherlands",
  "result_count": 12
}
```

### Profile View

```json
{
  "visitor_id": "visitor_123",
  "user_id": "user_456",
  "academy_id": "academy_789",
  "page_url": "/academies/academy_789",
  "referrer": "/academies"
}
```

---

## 16. Acceptance Criteria

The feature is complete when:

* Analytics Service is written in Go.
* Each endpoint has its own handler file.
* `types.go` contains all shared request and response types.
* Page visits can be tracked.
* Clicks can be tracked.
* Academy searches can be tracked.
* Academy profile views can be tracked.
* Login events can be tracked.
* Sessions can be tracked.
* Unique visitors can be calculated.
* Average time spent can be calculated.
* Admin reports can be returned from API endpoints.
* Service follows SOLID principles.
* Service uses clean architecture.
* Unit tests exist for handlers and services.
* Repository layer is abstracted behind interfaces.
* PostgreSQL implementation is available.
* No existing RollFinders services are broken.

---

## 17. Future Enhancements

Possible future improvements:

* Real-time analytics dashboard
* Funnel analysis
* Heatmap tracking
* Academy admin analytics dashboard
* Export reports as CSV
* Scheduled email reports
* Suspicious traffic detection
* Marketing campaign tracking using UTM parameters

---

# Final Note

This Analytics Service should give RollFinders clear insight into how users are using the application, what academies they search for, which profiles get attention, where users drop off, and which features create the most engagement.
