package repository

import (
	"rollfinders/internal/services/wallet/domain"
	"strings"
)

func NormalizeCurrency(currency string) string {
	if strings.EqualFold(strings.TrimSpace(currency), string(domain.CurrencyPoints)) {
		return string(domain.CurrencyPoints)
	}
	return strings.ToUpper(strings.TrimSpace(currency))
}
