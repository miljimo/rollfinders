package dataaccess

import (
	"context"

	"rollfinders/internal/services/academy/databases"
)

func CreateAcademy(ctx context.Context, db databases.DataContext, input CreateAcademyInput) (Academy, error) {
	results, err := db.Function(ctx, "academy.academyCreate",
		input.ID,
		input.OrganisationID,
		input.ApplicationID,
		input.Name,
		input.Slug,
		input.Description,
		input.ContactEmail,
		input.ContactPhone,
		input.WebsiteURL,
		input.ImageURL,
		input.AddressLine1,
		input.AddressLine2,
		input.City,
		input.Region,
		input.Postcode,
		input.Country,
		input.Latitude,
		input.Longitude,
		input.VerificationStatus,
		input.IsFeatured,
		input.SettingsJSON,
	)
	if err != nil {
		return Academy{}, err
	}
	if len(results) == 0 {
		return Academy{}, ErrNotFound
	}
	return academyFromRow(results[0]), nil
}
