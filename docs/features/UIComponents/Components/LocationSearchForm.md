# PRD: LocationSearchForm Component

Source: `src/components/LocationSearchForm.tsx`

## Purpose

Render a reusable location-aware search form for academy and open mat discovery.

## Requirements

IF the form renders  
WHEN `action`, `query`, and `placeholder` are provided  
THEN it SHALL render a `q` input and submit to the provided action.

IF latitude and longitude exist in URL search params  
WHEN the form renders  
THEN it SHALL include hidden `lat` and `lng` fields.

IF the user clicks the location button  
WHEN geolocation succeeds  
THEN the current URL SHALL update with fixed-precision `lat` and `lng`.

IF geolocation fails or is unavailable  
WHEN requested  
THEN the form SHALL remain usable without location.

## Done When

* Search submission preserves query and location fields.
* Location button has accessible label and disabled locating state.
* Auto-locate runs only when enabled and no location exists.
