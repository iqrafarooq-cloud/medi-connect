"use client";

import { useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

import { Label } from "@medi-connect/ui/components/label";

export type ClinicLocationValue = {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
};

type ClinicLocationPickerProps = {
  value: ClinicLocationValue | null;
  onChange: (value: ClinicLocationValue) => void;
};

type ResolvedPlace = {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
};

const PAKISTAN_CENTER = { lat: 30.3753, lng: 69.3451 };

function cityFromGeocoderComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): string {
  if (!components?.length) return "";
  const byType = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? "";
  return (
    byType("locality") ||
    byType("administrative_area_level_2") ||
    byType("administrative_area_level_1") ||
    ""
  );
}

function cityFromPlaceComponents(
  components: google.maps.places.AddressComponent[] | undefined,
): string {
  if (!components?.length) return "";
  const byType = (type: string) =>
    components.find((c) => c.types.includes(type))?.longText ??
    components.find((c) => c.types.includes(type))?.shortText ??
    "";
  return (
    byType("locality") ||
    byType("administrative_area_level_2") ||
    byType("administrative_area_level_1") ||
    ""
  );
}

function PlaceSearch({ onPlace }: { onPlace: (place: ResolvedPlace) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const places = useMapsLibrary("places");
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  useEffect(() => {
    if (!places || !containerRef.current) return;

    const PlaceAutocompleteElement = places.PlaceAutocompleteElement;
    if (!PlaceAutocompleteElement) return;

    const autocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ["pk"],
    });
    autocomplete.id = "location-search";
    autocomplete.className = "mc-place-autocomplete";
    autocomplete.setAttribute(
      "placeholder",
      "Search clinic area, landmark, or address",
    );
    // Force light chrome to match facility form inputs (Google defaults to system dark).
    autocomplete.style.setProperty("color-scheme", "light");
    autocomplete.style.setProperty("background-color", "#ffffff");
    autocomplete.style.setProperty("border", "1px solid var(--input)");
    autocomplete.style.setProperty("border-radius", "var(--radius)");
    autocomplete.style.setProperty("font-family", "inherit");
    autocomplete.style.setProperty("font-size", "0.875rem");
    autocomplete.style.setProperty("color", "var(--foreground)");
    autocomplete.style.width = "100%";
    autocomplete.style.minHeight = "2.75rem";
    autocomplete.style.height = "auto";
    autocomplete.style.overflow = "visible";
    autocomplete.style.boxSizing = "border-box";

    const container = containerRef.current;
    container.style.overflow = "visible";
    container.replaceChildren(autocomplete);

    async function onSelect(event: Event) {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent & {
        detail?: { placePrediction?: google.maps.places.PlacePrediction };
      };
      const prediction =
        selectEvent.placePrediction ?? selectEvent.detail?.placePrediction;
      if (!prediction) return;

      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location", "addressComponents"],
      });

      const location = place.location;
      if (!location) return;

      const latitude = location.lat();
      const longitude = location.lng();
      const address =
        place.formattedAddress ||
        place.displayName ||
        `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      const city = cityFromPlaceComponents(place.addressComponents) || "Pakistan";

      onPlaceRef.current({ address, city, latitude, longitude });
    }

    autocomplete.addEventListener("gmp-select", onSelect);

    return () => {
      autocomplete.removeEventListener("gmp-select", onSelect);
      autocomplete.remove();
    };
  }, [places]);

  return <div ref={containerRef} className="relative z-20 w-full overflow-visible" />;
}

function MapCamera({ value }: { value: ClinicLocationValue | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !value) return;
    map.panTo({ lat: value.latitude, lng: value.longitude });
    if ((map.getZoom() ?? 0) < 14) {
      map.setZoom(16);
    }
  }, [map, value?.latitude, value?.longitude]);

  return null;
}

function MapPin({
  value,
  onChange,
}: {
  value: ClinicLocationValue | null;
  onChange: (value: ClinicLocationValue) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  async function resolveLocation(lat: number, lng: number, fallbackAddress?: string) {
    let address = fallbackAddress?.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    let city = "Pakistan";

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      const result = response.results[0];
      if (result) {
        address = result.formatted_address || address;
        city = cityFromGeocoderComponents(result.address_components) || city;
      }
    } catch {
      // Keep coordinate fallback when reverse geocode is unavailable.
    }

    onChangeRef.current({ address, city, latitude: lat, longitude: lng });
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="space-y-2">
        <Label htmlFor="location-search">Clinic location</Label>
        <PlaceSearch onPlace={(place) => onChangeRef.current(place)} />
        <p className="text-xs text-muted-foreground">
          Search for the area, then drag the pin to the exact entrance.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Map
          className="h-64 w-full sm:h-72"
          defaultCenter={
            value
              ? { lat: value.latitude, lng: value.longitude }
              : PAKISTAN_CENTER
          }
          defaultZoom={value ? 16 : 5}
          gestureHandling="greedy"
          disableDefaultUI={false}
          onClick={(e) => {
            const lat = e.detail.latLng?.lat;
            const lng = e.detail.latLng?.lng;
            if (lat == null || lng == null) return;
            void resolveLocation(lat, lng);
          }}
        >
          <MapCamera value={value} />
          {value ? (
            <Marker
              position={{ lat: value.latitude, lng: value.longitude }}
              draggable
              onDragEnd={(e) => {
                const lat = e.latLng?.lat();
                const lng = e.latLng?.lng();
                if (lat == null || lng == null) return;
                void resolveLocation(lat, lng, value.address);
              }}
            />
          ) : null}
        </Map>
      </div>

      {value ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{value.city}</span>
          {" · "}
          {value.address}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No pin yet — search or click the map to place one.
        </p>
      )}
    </div>
  );
}

export function ClinicLocationPicker({ value, onChange }: ClinicLocationPickerProps) {
  const [ready, setReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="space-y-2 sm:col-span-2">
        <Label>Clinic location</Label>
        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground sm:h-72">
          Loading map…
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="space-y-2 sm:col-span-2">
        <Label>Clinic location</Label>
        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground sm:h-72">
          Set <code className="mx-1 text-foreground">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code className="mx-1 text-foreground">apps/web/.env</code>, then restart the dev server.
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      <MapPin value={value} onChange={onChange} />
    </APIProvider>
  );
}
