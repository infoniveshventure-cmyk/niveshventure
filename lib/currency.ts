// Always use $ (USD) for all monetary displays across the entire platform.
// No country-specific currency symbols are shown.

export function currencySymbol(_country?: string) {
  return "$";
}

export function formatMoney(amount: number, _country?: string) {
  return `$${(amount ?? 0).toLocaleString()}`;
}
