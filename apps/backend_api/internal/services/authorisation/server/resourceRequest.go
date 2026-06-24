package server

type resourceRequest struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	Target            string `json:"target"`
	LegacyDisplayName string `json:"display_name"`
}
