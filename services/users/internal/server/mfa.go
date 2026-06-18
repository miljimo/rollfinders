package server

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func mfaSecret() (string, error) {
	var raw [20]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(raw[:]), nil
}

func otpCode() (string, error) {
	var raw [4]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", binary.BigEndian.Uint32(raw[:])%1000000), nil
}

func verifyMFA(methodType, secret, code string, now time.Time) bool {
	code = strings.TrimSpace(code)
	switch strings.ToUpper(strings.TrimSpace(methodType)) {
	case "TOTP":
		return verifyTOTP(secret, code, now)
	case "EMAIL_OTP", "SMS_OTP":
		return code != "" && hmac.Equal([]byte(code), []byte(strings.TrimSpace(secret)))
	default:
		return false
	}
}

func verifyTOTP(secret, code string, now time.Time) bool {
	if len(code) != 6 {
		return false
	}
	for _, r := range code {
		if r < '0' || r > '9' {
			return false
		}
	}
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(strings.TrimSpace(secret)))
	if err != nil {
		return false
	}
	counter := now.Unix() / 30
	for offset := int64(-1); offset <= 1; offset++ {
		if totpAt(key, counter+offset) == code {
			return true
		}
	}
	return false
}

func totpAt(key []byte, counter int64) string {
	var msg [8]byte
	binary.BigEndian.PutUint64(msg[:], uint64(counter))
	mac := hmac.New(sha1.New, key)
	_, _ = mac.Write(msg[:])
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	binaryCode := (int(sum[offset])&0x7f)<<24 |
		(int(sum[offset+1])&0xff)<<16 |
		(int(sum[offset+2])&0xff)<<8 |
		(int(sum[offset+3]) & 0xff)
	return strconv.Itoa(binaryCode%1000000 + 1000000)[1:]
}
