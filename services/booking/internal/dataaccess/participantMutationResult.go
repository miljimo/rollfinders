package dataaccess

import (
	"strings"

	"booking/internal/databases"
)

func participantMutationResult(rows databases.DBResults, err error) (Participant, error) {
	if err != nil {
		message := strings.ToLower(err.Error())
		if strings.Contains(message, "booking_not_found") || strings.Contains(message, "participant_not_found") {
			return Participant{}, ErrNotFound
		}
		if strings.Contains(message, "invalid_status") {
			return Participant{}, ErrInvalidTransition
		}
		return Participant{}, err
	}
	row, err := firstRow(rows)
	if err != nil {
		return Participant{}, err
	}
	return participantFromRow(row), nil
}
