package money

import (
	"errors"
	"math/big"
	"regexp"
	"slices"
)

var Pattern = regexp.MustCompile(`^(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$`)
var Currencies = []string{"BRL", "USD", "EUR", "GBP", "ARS", "CAD", "JPY", "CHF"}

func ValidCurrency(currency string) bool { return slices.Contains(Currencies, currency) }
func Parse(s string) (*big.Rat, error) {
	if !Pattern.MatchString(s) {
		return nil, errors.New("invalid decimal")
	}
	v, ok := new(big.Rat).SetString(s)
	if !ok {
		return nil, errors.New("invalid decimal")
	}
	return v, nil
}
func Scale(currency string) int {
	if currency == "JPY" {
		return 0
	}
	return 2
}

// Round uses exact rational arithmetic and half-up rounding for nonnegative prices.
func Round(v *big.Rat, scale int) string {
	power := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(scale)), nil)
	n := new(big.Int).Mul(v.Num(), power)
	q, r := new(big.Int).QuoRem(n, v.Denom(), new(big.Int))
	if new(big.Int).Mul(r, big.NewInt(2)).Cmp(v.Denom()) >= 0 {
		q.Add(q, big.NewInt(1))
	}
	return new(big.Rat).SetFrac(q, power).FloatString(scale)
}
