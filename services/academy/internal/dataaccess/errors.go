package dataaccess

import "errors"

var (
	ErrNotFound = errors.New("academy resource not found")
	ErrConflict = errors.New("academy resource conflict")
)
