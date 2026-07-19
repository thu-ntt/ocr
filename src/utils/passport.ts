import {
  findPassportDates,
  normalizePassportDate,
} from '../services/passportDate.service'

export const EMPTY_PASSPORT = {
  passportNumber: "",
  surname: "",
  givenName: "",
  fullName: "",
  nationality: "",
  gender: "" as const,
  dateOfBirth: "",
  issueDate: "",
  expiryDate: "",
};

export function normalizeDate(value: string): string {
  return normalizePassportDate(value)
}

export function findDatesInText(text: string): string[] {
  return findPassportDates(text)
}

export function mrzDate(value: string, kind: "birth" | "expiry"): string {
  if (!/^\d{6}$/.test(value)) return "";
  const yy = Number(value.slice(0, 2));
  const current = new Date().getFullYear() % 100;
  const century =
    kind === "birth" ? (yy > current ? 1900 : 2000) : yy < 50 ? 2000 : 1900;
  return `${century + yy}-${value.slice(2, 4)}-${value.slice(4, 6)}`;
}
