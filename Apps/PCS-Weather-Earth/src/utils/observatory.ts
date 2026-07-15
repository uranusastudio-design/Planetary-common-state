import type { VisitorCountryRanking, VisitorLocation } from '../types/observatory';

const COUNTRY_NAMES: Record<string, string> = {
  AU: 'Australia', CA: 'Canada', DE: 'Germany', FR: 'France',
  GB: 'United Kingdom', JP: 'Japan', TW: 'Taiwan', US: 'United States',
};
const COUNTRY_CODES = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name.toLowerCase(), code])
);

export function normalizeCountryCode(code: string | null | undefined, name?: string | null): string | null {
  const normalizedCode = code?.trim().toUpperCase();
  if (normalizedCode && normalizedCode.length === 2) return normalizedCode;
  return name ? COUNTRY_CODES[name.trim().toLowerCase()] ?? null : null;
}

export function normalizeCountryName(name: string | null | undefined, code?: string | null): string | null {
  const normalizedName = name?.trim();
  if (normalizedName && normalizedName.length > 2 && normalizedName.toUpperCase() !== 'UNKNOWN') {
    return normalizedName;
  }
  const normalizedCode = normalizeCountryCode(code, normalizedName);
  return normalizedCode ? COUNTRY_NAMES[normalizedCode] ?? normalizedCode : normalizedName || null;
}

export function isTaiwan(code: string | null | undefined, name?: string | null): boolean {
  return normalizeCountryCode(code, name) === 'TW' || name?.trim().toLowerCase() === 'taiwan';
}

export function countryFlag(code: string | null | undefined, name?: string | null): string {
  const normalizedCode = normalizeCountryCode(code, name);
  return normalizedCode
    ? String.fromCodePoint(...[...normalizedCode].map((character) => 127397 + character.charCodeAt(0)))
    : '🌐';
}

export function formatLocationName(location: Pick<VisitorLocation, 'city' | 'country' | 'countryCode'>): string {
  const country = normalizeCountryName(location.country, location.countryCode);
  if (location.city && country) return `${location.city}, ${country}`;
  return location.city || country || 'Unknown Region';
}

export function formatRelativeObservation(isoTime: string, now = Date.now()): string {
  const timestamp = new Date(isoTime).getTime();
  if (!Number.isFinite(timestamp)) return 'Unknown';
  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 90) return 'Active now';
  if (elapsedSeconds < 3_600) return `${Math.floor(elapsedSeconds / 60)} min ago`;
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3_600)} hr ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function groupRecentLocations(locations: VisitorLocation[], limit = 10): VisitorLocation[] {
  const byCity = new Map<string, VisitorLocation>();
  for (const location of locations) {
    const code = normalizeCountryCode(location.countryCode, location.country);
    const country = normalizeCountryName(location.country, code);
    const key = `${location.city?.trim().toLowerCase() || 'unknown'}|${code || country?.toLowerCase() || 'unknown'}`;
    const existing = byCity.get(key);
    const normalized = { ...location, countryCode: code, country };
    if (!existing) {
      byCity.set(key, normalized);
      continue;
    }
    const isNewer = new Date(location.lastSeen).getTime() > new Date(existing.lastSeen).getTime();
    byCity.set(key, {
      ...(isNewer ? normalized : existing),
      count: existing.count + location.count,
      lastSeen: isNewer ? location.lastSeen : existing.lastSeen,
    });
  }
  return [...byCity.values()]
    .sort((left, right) => new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime())
    .slice(0, limit);
}

export function internationalCountries(countries: VisitorCountryRanking[], limit = 5): VisitorCountryRanking[] {
  return countries
    .filter((country) => !isTaiwan(country.countryCode, country.country))
    .map((country) => ({
      ...country,
      countryCode: normalizeCountryCode(country.countryCode, country.country) ?? country.countryCode,
      country: normalizeCountryName(country.country, country.countryCode),
    }))
    .sort((left, right) => right.visits - left.visits)
    .slice(0, limit);
}
