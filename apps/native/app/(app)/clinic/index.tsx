import { Ionicons } from "@expo/vector-icons";
import {
  clampEtaMinutes,
  DEFAULT_ETA_MINUTES,
  etaMinutesFromKm,
  filterEnrolledClinics,
  MAX_ETA_MINUTES,
} from "@medi-connect/api/lib/health-remedy";
import type { NearbyClinic } from "@medi-connect/api/lib/health-remedy";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { Spinner, useThemeColor, useToast } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";

import { ClinicRow } from "@/components/clinic/clinic-row";
import { OnTheWayCard } from "@/components/clinic/on-the-way-card";
import { QueueStatusCard } from "@/components/clinic/queue-status-card";
import { getRpcErrorMessage } from "@/lib/form-errors";
import {
  fitMapToClinics,
  LAHORE_REGION,
  MAX_NEARBY_KM,
  minutesUntilEta,
  originIsNearby,
  type MapPoint,
} from "@/lib/clinic-map";
import { palette } from "@/theme";
import { client, orpc, queryClient } from "@/utils/orpc";

export default function ClinicMapScreen() {
  const { toast } = useToast();
  const params = useLocalSearchParams<{ focus?: string }>();
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const mapRef = useRef<MapView>(null);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<MapPoint | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<NearbyClinic | null>(null);
  const [minutes, setMinutes] = useState(DEFAULT_ETA_MINUTES);
  const [busy, setBusy] = useState(false);

  const nearby = useQuery({
    ...orpc.clinic.nearby.queryOptions({
      input: origin
        ? { latitude: origin.latitude, longitude: origin.longitude }
        : {},
    }),
    enabled: locationReady,
  });
  const queue = useQuery(orpc.triage.myQueue.queryOptions());

  const clinics = useMemo(
    () => filterEnrolledClinics(nearby.data ?? [], search),
    [nearby.data, search],
  );
  const clinicPoints = useMemo(
    () =>
      (nearby.data ?? []).map((clinic) => ({
        latitude: clinic.latitude,
        longitude: clinic.longitude,
      })),
    [nearby.data],
  );
  const localOrigin = originIsNearby(origin, clinicPoints) ? origin : null;
  const queuedClinic = useMemo(
    () => clinics.find((clinic) => clinic.id === queue.data?.clinicId) ?? null,
    [clinics, queue.data?.clinicId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await Location.getForegroundPermissionsAsync();
        let status = existing.status;
        if (status !== "granted") {
          const requested = await Location.requestForegroundPermissionsAsync();
          status = requested.status;
        }
        if (cancelled) return;
        if (status !== "granted") {
          setLocationDenied(true);
          setLocationReady(true);
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setOrigin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        if (!cancelled) setLocationDenied(true);
      } finally {
        if (!cancelled) setLocationReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const animateTo = useCallback((region: Region) => {
    mapRef.current?.animateToRegion(region, 450);
  }, []);

  useEffect(() => {
    if (!locationReady || nearby.isLoading) return;
    const focusNearby = params.focus === "nearby";
    const queuedPoint = queuedClinic
      ? [{ latitude: queuedClinic.latitude, longitude: queuedClinic.longitude }]
      : [];
    const region = fitMapToClinics(
      queuedPoint.length ? queuedPoint : focusNearby ? clinicPoints.slice(0, 5) : clinicPoints,
      localOrigin,
    );
    animateTo(region);
    if (queuedClinic) setSelectedId(queuedClinic.id);
  }, [
    animateTo,
    clinicPoints,
    localOrigin,
    locationReady,
    nearby.isLoading,
    params.focus,
    queuedClinic,
  ]);

  function selectClinic(clinic: NearbyClinic) {
    setSelectedId(clinic.id);
    animateTo({
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
  }

  function openWay(clinic: NearbyClinic) {
    setSelectedId(clinic.id);
    setConfirm(clinic);
    setMinutes(
      clinic.distanceKm != null && clinic.distanceKm <= MAX_NEARBY_KM
        ? etaMinutesFromKm(clinic.distanceKm)
        : DEFAULT_ETA_MINUTES,
    );
    selectClinic(clinic);
  }

  async function confirmWay() {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      await client.triage.joinFromPatient({
        clinicId: confirm.id,
        etaMinutesFromNow: clampEtaMinutes(minutes),
      });
      await queryClient.invalidateQueries({ queryKey: orpc.triage.myQueue.queryOptions().queryKey });
      setConfirm(null);
      toast.show({
        variant: "success",
        label: `You're in the queue at ${confirm.name}`,
      });
    } catch (error) {
      toast.show({
        variant: "danger",
        label: getRpcErrorMessage(error, "Could not join the clinic queue"),
      });
    } finally {
      setBusy(false);
    }
  }

  const emptyMessage = !nearby.data?.length
    ? "No enrolled clinic is listed yet."
    : "No enrolled clinic matches that search.";
  const etaMinutes = queue.data
    ? Math.min(MAX_ETA_MINUTES, minutesUntilEta(new Date(queue.data.etaAt)))
    : 0;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-2">
          <View className="flex-row items-center rounded-2xl border border-border bg-surface px-3.5" style={{ height: 52 }}>
            <Ionicons name="search" size={18} color={muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search nearby clinics..."
              placeholderTextColor={muted}
              className="ml-2 flex-1 text-[16px] text-foreground"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search nearby clinics"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="mx-4 mt-3 overflow-hidden rounded-2xl border border-border" style={{ height: 260 }}>
          {Platform.OS === "web" ? (
            <View className="flex-1 items-center justify-center bg-surface-secondary px-6">
              <Ionicons name="map-outline" size={28} color={muted} />
              <Text className="mt-2 text-center text-[14px] leading-5 text-muted">
                Open the iOS or Android app to see the clinic map.
              </Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={{ width: "100%", height: 260 }}
              provider={PROVIDER_GOOGLE}
              initialRegion={LAHORE_REGION}
              showsUserLocation={Boolean(localOrigin)}
              showsMyLocationButton={false}
              toolbarEnabled={false}
            >
              {clinics.map((clinic) => (
                <Marker
                  key={clinic.id}
                  coordinate={{ latitude: clinic.latitude, longitude: clinic.longitude }}
                  title={clinic.name}
                  pinColor={
                    clinic.id === queue.data?.clinicId
                      ? palette.tertiary
                      : clinic.id === selectedId
                        ? palette.secondary
                        : palette.primary
                  }
                  onPress={() => selectClinic(clinic)}
                />
              ))}
            </MapView>
          )}
        </View>

        {queue.data ? (
          <View className="mt-3">
            <QueueStatusCard clinicName={queue.data.clinicName} minutesLeft={etaMinutes} />
          </View>
        ) : null}

        {confirm ? (
          <View className="px-4 mt-3">
            <OnTheWayCard
              clinicName={confirm.name}
              minutes={minutes}
              busy={busy}
              onChangeMinutes={setMinutes}
              onClose={() => {
                if (!busy) setConfirm(null);
              }}
              onConfirm={() => void confirmWay()}
            />
          </View>
        ) : null}

        <View className="px-4 mt-5">
          <Text className="text-[20px] font-bold text-foreground tracking-tight">Nearby Clinics</Text>
          {locationDenied || !origin ? (
            <Text className="mt-1 text-[13px] leading-5 text-muted">
              Showing enrolled clinics. Turn on location on this device to rank them by distance.
            </Text>
          ) : !localOrigin ? (
            <Text className="mt-1 text-[13px] leading-5 text-muted">
              Showing enrolled clinics. Distances appear when you are nearby.
            </Text>
          ) : (
            <Text className="mt-1 text-[13px] leading-5 text-muted">
              Enrolled MediConnect clinics only.
            </Text>
          )}

          {nearby.isLoading ? (
            <View className="items-center py-10">
              <Spinner size="sm" />
            </View>
          ) : clinics.length === 0 ? (
            <View className="mt-6 items-center rounded-2xl border border-dashed border-border px-4 py-8">
              <Ionicons name="map-outline" size={22} color={foreground} />
              <Text className="mt-3 text-center text-[15px] leading-6 text-muted">{emptyMessage}</Text>
            </View>
          ) : (
            <View className="mt-4 gap-3">
              {clinics.map((clinic) => (
                <ClinicRow
                  key={clinic.id}
                  clinic={clinic}
                  selected={selectedId === clinic.id}
                  enRoute={queue.data?.clinicId === clinic.id}
                  onSelect={() => selectClinic(clinic)}
                  onWay={() => openWay(clinic)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
