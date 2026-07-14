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
