package dataaccess

import "errors"

var ErrNotFound = errors.New("not found")

func firstRow(rows []map[string]interface{}, err error) (map[string]interface{}, error) {
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, ErrNotFound
	}
	return rows[0], nil
}
