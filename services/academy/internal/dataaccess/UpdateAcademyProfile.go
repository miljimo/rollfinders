package dataaccess

import (
	"context"

	"academy/internal/databases"
)

func UpdateAcademyProfile(ctx context.Context, db databases.DataContext, input UpdateAcademyProfileInput) (Academy, error) {
	results, err := db.Function(ctx, "academy.academyUpdateProfile",
		input.ID,
		input.Name,
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
