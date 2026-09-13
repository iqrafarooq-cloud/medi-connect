export type MapPoint = { latitude: number; longitude: number };

export type MapRegion = MapPoint & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export const LAHORE_REGION: MapRegion = {
  latitude: 31.5204,
  longitude: 74.3587,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export function formatClinicDistance(km: number | null): string | null {
  if (km == null) return null;
  return `${km.toFixed(1)} km away`;
}

export function fitMapToClinics(points: MapPoint[], origin?: MapPoint | null): MapRegion {
  if (points.length === 0 && !origin) return LAHORE_REGION;

  const coords = origin ? [origin, ...points] : points;
  if (coords.length === 1) {
    const point = coords[0]!;
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
  }

  const lats = coords.map((point) => point.latitude);
  const lngs = coords.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latitudeDelta = Math.max(0.04, (maxLat - minLat) * 1.6);
  const longitudeDelta = Math.max(0.04, (maxLng - minLng) * 1.6);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}
