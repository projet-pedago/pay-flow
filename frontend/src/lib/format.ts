import type { PeriodStatus } from "./types";

export function money(value: number, currency: "EUR" | "XOF" = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function moneyExact(value: number, currency: "EUR" | "XOF" = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function percent(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function statusLabel(status: PeriodStatus) {
  const map: Record<PeriodStatus, string> = {
    draft: "Brouillon",
    calculated: "Calculée",
    validated: "Validée",
    paid: "Payée",
  };
  return map[status];
}

export function bulletinNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function bulletinRate(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value * 100);
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
