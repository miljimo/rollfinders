package server

type TrackEventRequest struct {
	EventName   string         `json:"eventName"`
	VisitorID   string         `json:"visitorId,omitempty"`
	SessionID   string         `json:"sessionId,omitempty"`
	IPHash      string         `json:"ipHash,omitempty"`
	AcademyID   string         `json:"academyId,omitempty"`
	OpenMatID   string         `json:"openMatId,omitempty"`
	CourseID    string         `json:"courseId,omitempty"`
	CourseType  string         `json:"courseType,omitempty"`
	CountryCode string         `json:"countryCode,omitempty"`
	CountryName string         `json:"countryName,omitempty"`
	Source      string         `json:"source,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type TrackEventResponse struct {
	EventID string `json:"eventId"`
	Status  string `json:"status"`
}

type AggregateResponse struct {
	OK         bool          `json:"ok"`
	MetricDate string        `json:"metricDate"`
	Metrics    []DailyMetric `json:"metrics"`
	Error      string        `json:"error,omitempty"`
}

type DailyMetric struct {
	MetricName  string         `json:"metricName"`
	MetricValue int            `json:"metricValue"`
	MetricDate  string         `json:"metricDate"`
	Metadata    map[string]any `json:"metadata"`
}

type FounderSummaryResponse struct {
	Summary     Summary         `json:"summary"`
	Trends      []DailyMetric   `json:"trends"`
	Countries   []CountrySignal `json:"countries"`
	DailyVisits []DailyVisit    `json:"dailyVisits"`
	LoggedIn    LoggedInUsers   `json:"loggedInUsers"`
	Days        int             `json:"days"`
}

type Summary struct {
	Marketplace struct {
		VisitorCount int `json:"visitorCount"`
		SessionCount int `json:"sessionCount"`
	} `json:"marketplace"`
	Visitor struct {
		UniqueVisitors int `json:"uniqueVisitors"`
		UniqueSessions int `json:"uniqueSessions"`
	} `json:"visitor"`
	Search struct {
		AcademySearches int `json:"academySearches"`
		OpenMatSearches int `json:"openMatSearches"`
		CourseSearches  int `json:"courseSearches"`
	} `json:"search"`
	Profile struct {
		AcademyProfileViews int `json:"academyProfileViews"`
		OpenMatViews        int `json:"openMatViews"`
		CourseViews         int `json:"courseViews"`
	} `json:"profile"`
	Commercial struct {
		CommercialIntentClicks int `json:"commercialIntentClicks"`
	} `json:"commercial"`
	Claim struct {
		ClaimStarts      int `json:"claimStarts"`
		ClaimSubmissions int `json:"claimSubmissions"`
		ClaimsApproved   int `json:"claimsApproved"`
		ClaimsRejected   int `json:"claimsRejected"`
	} `json:"claim"`
	Supply struct {
		AcademiesCreated        int `json:"academiesCreated"`
		OpenMatsCreated         int `json:"openMatsCreated"`
		CoursesCreated          int `json:"coursesCreated"`
		RecurringCoursesCreated int `json:"recurringCoursesCreated"`
	} `json:"supply"`
}

type CountrySignal struct {
	CountryCode  *string `json:"countryCode"`
	CountryName  string  `json:"countryName"`
	EventCount   int     `json:"eventCount"`
	VisitorCount int     `json:"visitorCount"`
}

type DailyVisit struct {
	Date           string `json:"date"`
	UniqueVisitors int    `json:"uniqueVisitors"`
	UniqueSessions int    `json:"uniqueSessions"`
	EventCount     int    `json:"eventCount"`
}

type LoggedInUsers struct {
	ActiveWindowMinutes   int                 `json:"activeWindowMinutes"`
	CurrentCount          int                 `json:"currentCount"`
	LoggedInTodayCount    int                 `json:"loggedInTodayCount"`
	LoggedInSevenDayCount int                 `json:"loggedInSevenDayCount"`
	ByRole                []LoggedInRoleCount `json:"byRole"`
}

type LoggedInRoleCount struct {
	Role         string `json:"role"`
	CurrentCount int    `json:"currentCount"`
}
