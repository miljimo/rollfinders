package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type organisationClient struct {
	baseURL string
	client  *http.Client
}

type applicationServiceAvailability struct {
	ApplicationID string `json:"application_id"`
	ServiceKey    string `json:"service_key"`
	Enabled       bool   `json:"enabled"`
}

type applicationServicesResponse struct {
	Services []applicationServiceAvailability `json:"services"`
}

type organisationApplication struct {
	ID             string `json:"application_id"`
	OrganisationID string `json:"organisation_id"`
	Status         string `json:"status"`
}

type applicationResponse struct {
	Application organisationApplication `json:"application"`
}

func (c organisationClient) getApplication(ctx context.Context, applicationID string) (organisationApplication, error) {
	if c.baseURL == "" {
		return organisationApplication{}, errNotFound
	}
	var result applicationResponse
	if err := c.getJSON(ctx, fmt.Sprintf("/v1/applications/%s", url.PathEscape(applicationID)), &result); err != nil {
		return organisationApplication{}, err
	}
	if result.Application.ID == "" {
		return organisationApplication{}, errNotFound
	}
	return result.Application, nil
}

func (c organisationClient) listApplicationServices(ctx context.Context, applicationID string) ([]applicationServiceAvailability, error) {
	if c.baseURL == "" {
		return nil, errNotFound
	}
	var result applicationServicesResponse
	if err := c.getJSON(ctx, fmt.Sprintf("/v1/applications/%s/services?limit=100", url.PathEscape(applicationID)), &result); err != nil {
		return nil, err
	}
	return result.Services, nil
}

func (c organisationClient) getJSON(ctx context.Context, path string, target any) error {
	client := c.client
	if client == nil {
		client = http.DefaultClient
	}
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	endpoint := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errNotFound
	}
	return json.NewDecoder(resp.Body).Decode(target)
}
