# PRD: SearchForm Component

## Implementation Metadata

- Source: `src/components/SearchForm.tsx`
- Status: Ready for development
- Related shared primitive: `Button`

## Purpose

Render a simple reusable query search form.

## Requirements

IF `SearchForm` renders  
WHEN `action`, `query`, and `placeholder` are supplied  
THEN it SHALL render a form with input name `q` and a submit button.

IF `query` is supplied  
WHEN the input renders  
THEN the input SHALL use it as the default value.

IF the form is used on mobile  
WHEN controls stack  
THEN input and button SHALL remain usable.

IF the form submits  
WHEN the request is made  
THEN it SHALL use GET-compatible query navigation and avoid client-only dependencies.

## Done When

* Action and placeholder are not hardcoded.
* Input and button use existing styling.
* Form supports server-side GET navigation.
