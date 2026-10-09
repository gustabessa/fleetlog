package money

import (
	"math/big"
	"testing"
)

func TestExactRounding(t *testing.T) {
	for _, tc := range []struct{ s, c, w string }{{"1.005", "BRL", "1.01"}, {"123.5", "JPY", "124"}, {"0.004999", "USD", "0.00"}, {"999999999999.99", "BRL", "999999999999.99"}} {
		v, e := Parse(tc.s)
		if e != nil || Round(v, Scale(tc.c)) != tc.w {
			t.Fatal(tc, e)
		}
	}
	a, _ := Parse("42.5")
	b, _ := Parse("6.2")
	if Round(new(big.Rat).Mul(a, b), 2) != "263.50" {
		t.Fatal("inexact total")
	}
	for _, s := range []string{"-1", "1e2", "1,2", ".5", "1000000000000", "1.1234567"} {
		if _, e := Parse(s); e == nil {
			t.Fatal(s)
		}
	}
}
