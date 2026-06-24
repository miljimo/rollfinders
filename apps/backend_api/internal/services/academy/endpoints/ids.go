package endpoints

import (
	"crypto/rand"
	"encoding/hex"
)

func newID(prefix string) string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return prefix + "_0000000000000000"
	}
	return prefix + "_" + hex.EncodeToString(buf)
}
