// Money is always integer minor units + an ISO-4217 code in the database
// (never floats) — docs/ARCHITECTURE.md section 3. These are the only
// places a float should ever appear, and only for display.

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

export function formatMoney(minor: number, currency: string, locale: string = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(fromMinorUnits(minor));
}
