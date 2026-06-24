package worker

import "time"

const MaxAttempts = 5

var RetryDelays = []time.Duration{
	0,
	time.Minute,
	5 * time.Minute,
	15 * time.Minute,
	time.Hour,
}

func NextRetryTime(now time.Time, completedAttempt int) (time.Time, bool) {
	if completedAttempt >= MaxAttempts {
		return time.Time{}, false
	}
	if completedAttempt < 0 {
		completedAttempt = 0
	}
	delayIndex := completedAttempt
	if delayIndex >= len(RetryDelays) {
		return time.Time{}, false
	}
	return now.Add(RetryDelays[delayIndex]), true
}

func PriorityRank(priority string) int {
	switch priority {
	case PriorityCritical:
		return 0
	case PriorityHigh:
		return 1
	case PriorityNormal, "":
		return 2
	case PriorityLow:
		return 3
	case PriorityBulk:
		return 4
	default:
		return 5
	}
}
