// Indian currency + measurement formatting, migrated from the prototype and
// made reusable. Lakh/crore aware.
export function inr(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return "₹0";
  const v = Number(n);
  if (Math.abs(v) >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
  if (Math.abs(v) >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  return "₹" + v.toLocaleString("en-IN");
}

export function inrFull(n: number | null | undefined): string {
  if (n == null) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN");
}

export function sqft(n: number | null | undefined): string {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN") + " sqft";
}

export function daysLeft(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function dateLabel(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
