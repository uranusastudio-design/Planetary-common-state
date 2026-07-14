import { PCS_BACKEND_URL } from './weatherLayers';
import type { VisitorAnalytics, VisitorAnalyticsRange, VisitorLocationsResponse } from '../types/observatory';

export const VISITOR_LOCATIONS_REFRESH_INTERVAL_MS = 60_000;
export const VISITOR_ANALYTICS_REFRESH_INTERVAL_MS = 5 * 60_000;

export function observatoryApiUrl(path: string): string {
  return `${PCS_BACKEND_URL.replace(/\/$/, '')}${path}`;
}

export async function fetchVisitorLocations(): Promise<VisitorLocationsResponse> {
  const response = await fetch(observatoryApiUrl('/api/visitors/locations'), {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Visitor locations failed: ${response.status}`);
  }

  return response.json() as Promise<VisitorLocationsResponse>;
}

export async function fetchVisitorAnalytics(range: VisitorAnalyticsRange): Promise<VisitorAnalytics> {
  const response = await fetch(observatoryApiUrl(`/api/visitors/analytics?range=${range}`), {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Visitor analytics failed: ${response.status}`);
  }

  return response.json() as Promise<VisitorAnalytics>;
}
