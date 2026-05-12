import countryList from "flag-icons/country.json";

const supportedFlagCodes = new Set(
  (countryList as Array<{ code: string }>).map(({ code }) => code.toUpperCase())
);

export function hasFlagIcon(code?: string | null): boolean {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    return false;
  }

  return supportedFlagCodes.has(normalizedCode);
}
