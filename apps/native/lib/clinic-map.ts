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

export const MAX_NEARBY_KM = 250;

export function formatClinicDistance(km: number | null): string | null {
  if (km == null || km > MAX_NEARBY_KM) return null;
  return `${km.toFixed(1)} km away`;
}

export function originIsNearby(
  origin: MapPoint | null,
  points: MapPoint[],
  maxKm = MAX_NEARBY_KM,
): origin is MapPoint {
  if (!origin || points.length === 0) return false;
  return points.some((point) => {
    const dLat = ((point.latitude - origin.latitude) * Math.PI) / 180;
    const dLon = ((point.longitude - origin.longitude) * Math.PI) / 180;
    const lat1 = (origin.latitude * Math.PI) / 180;
    const lat2 = (point.latitude * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))) <= maxKm;
  });
}

export function formatQueueStatus(clinicName: string): string {
  return `You're in the queue at ${clinicName}`;
}

export function clinicQueueButton(
  clinicId: string,
  queuedClinicId: string | null,
): "join" | "here" | "blocked" {
  if (!queuedClinicId) return "join";
  if (queuedClinicId === clinicId) return "here";
  return "blocked";
}

export function minutesUntilEta(etaAt: Date, now = new Date()): number {
  return Math.max(0, Math.round((etaAt.getTime() - now.getTime()) / 60_000));
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
