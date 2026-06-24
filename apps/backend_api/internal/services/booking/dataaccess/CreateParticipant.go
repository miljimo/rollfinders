package dataaccess

import (
	"context"

	"rollfinders/internal/services/booking/databases"
)

func CreateParticipant(ctx context.Context, db databases.DataContext, input CreateParticipantInput) (Participant, error) {
	rows, err := db.Function(
		ctx,
		`booking."participantCreate"`,
		input.ID,
		input.BookingID,
		nullable(input.CustomerID),
		nullable(input.GuestReference),
		nullable(input.DisplayName),
		input.Metadata,
	)
	return participantMutationResult(rows, err)
}
