package server

import (
	"crypto/rand"
	"encoding/hex"
)

func newID(prefix string) string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return prefix + "_unknown"
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}
