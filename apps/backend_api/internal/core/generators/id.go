package generators

import (
	"crypto/rand"
	"encoding/hex"
)

func CreateNewId(prefix string, size uint8) string {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes[:]); err != nil {
		return "usr_fallback"
	}
	return prefix + hex.EncodeToString(bytes[:])
}
