export interface VisitorLocation {
  country: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  count: number;
  lastSeen: string;
}

export interface VisitorLocationsResponse {
  locations: VisitorLocation[];
  lastUpdated: string;
}

export type VisitorAnalyticsRange = '24h' | '7d' | '30d';

export interface VisitorCountryRanking {
  country: string | null;
  countryCode: string;
  visits: number;
  uniqueSessions: number;
}

export interface VisitorTrendBucket {
  time: string;
  visits: number;
  uniqueSessions: number;
}

export interface VisitorHeatLocation {
  country: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  weight: number;
  lastSeen: string;
}

export interface VisitorAnalyticsSummary {
  peakVisits: number;
  peakTime: string | null;
  topCountry: string | null;
  activeRegions: number;
}

export interface VisitorAnalytics {
  range: VisitorAnalyticsRange;
  countryRanking: VisitorCountryRanking[];
  trend: VisitorTrendBucket[];
  heatLocations: VisitorHeatLocation[];
  summary: VisitorAnalyticsSummary;
  lastUpdated: string;
}

export type CelestialBodyId =
  | 'earth'
  | 'moon'
  | 'mars'
  | 'venus'
  | 'mercury'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';
