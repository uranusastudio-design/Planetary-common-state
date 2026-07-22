import * as Cesium from 'cesium';

export interface GeographicCoordinatesInput {
  altitude?: unknown;
  altitude_m?: unknown;
  height?: unknown;
  lat?: unknown;
  latitude?: unknown;
  lng?: unknown;
  lon?: unknown;
  longitude?: unknown;
}

export interface GeographicMarkerInput extends GeographicCoordinatesInput {
  layerId: string;
  markerId: string;
  type: string;
}

export interface GeographicMarker {
  height: number;
  id: string;
  latitude: number;
  layerId: string;
  longitude: number;
  markerId: string;
  position: Cesium.Cartesian3;
  type: string;
}

export function normalizeCoordinates(input: GeographicCoordinatesInput) {
  return {
    longitude: Number(input.longitude ?? input.lon ?? input.lng),
    latitude: Number(input.latitude ?? input.lat),
    height: Number(input.height ?? input.altitude ?? input.altitude_m ?? 0),
  };
}

export function createGeographicMarker(input: GeographicMarkerInput): GeographicMarker | null {
  const { longitude, latitude, height } = normalizeCoordinates(input);
  if (
    !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || !Number.isFinite(height)
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
  ) {
    console.warn('Invalid geographic marker coordinates', {
      layerId: input.layerId,
      markerId: input.markerId,
      longitude,
      latitude,
      height,
      type: input.type,
    });
    return null;
  }

  return {
    id: `${input.layerId}:${input.markerId}`,
    layerId: input.layerId,
    markerId: input.markerId,
    longitude,
    latitude,
    height,
    type: input.type,
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
  };
}
