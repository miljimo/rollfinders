package dataaccess

import "errors"

var (
	ErrNotFound = errors.New("notification not found")
	ErrConflict = errors.New("notification conflict")
)
