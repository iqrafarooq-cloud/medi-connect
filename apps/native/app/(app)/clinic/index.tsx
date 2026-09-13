import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { etaMinutesFromKm, filterEnrolledClinics } from "@medi-connect/api/lib/health-remedy";
import type { NearbyClinic } from "@medi-connect/api/lib/health-remedy";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { Spinner, useThemeColor, useToast } from "heroui-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";

import { ClinicRow } from "@/components/clinic/clinic-row";
import { OnTheWaySheet } from "@/components/clinic/on-the-way-sheet";
import { getRpcErrorMessage } from "@/lib/form-errors";
import { fitMapToClinics, LAHORE_REGION, type MapPoint } from "@/lib/clinic-map";
import { palette } from "@/theme";
import { client, orpc } from "@/utils/orpc";

export default function ClinicMapScreen() {
  const { toast } = useToast();
  const params = useLocalSearchParams<{ focus?: string }>();
  const surface = useThemeColor("surface");
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState<MapPoint | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enRouteId, setEnRouteId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<NearbyClinic | null>(null);
  const [minutes, setMinutes] = useState(15);
  const [busy, setBusy] = useState(false);

  const nearby = useQuery({
    ...orpc.clinic.nearby.queryOptions({
      input: origin
        ? { latitude: origin.latitude, longitude: origin.longitude }
        : {},
    }),
    enabled: locationReady,
  });

  const clinics = useMemo(
    () => filterEnrolledClinics(nearby.data ?? [], search),
    [nearby.data, search],
  );

  const snapPoints = useMemo(() => ["30%", "48%", "80%"], []);

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
    const points = (nearby.data ?? []).map((clinic) => ({
      latitude: clinic.latitude,
      longitude: clinic.longitude,
    }));
    const region = fitMapToClinics(focusNearby ? points.slice(0, 5) : points, origin);
    animateTo(region);
    if (focusNearby) sheetRef.current?.snapToIndex(1);
  }, [animateTo, locationReady, nearby.data, nearby.isLoading, origin, params.focus]);

  function selectClinic(clinic: NearbyClinic) {
    setSelectedId(clinic.id);
    animateTo({
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
    sheetRef.current?.snapToIndex(1);
  }

  function openWay(clinic: NearbyClinic) {
    setSelectedId(clinic.id);
    setConfirm(clinic);
    setMinutes(etaMinutesFromKm(clinic.distanceKm));
  }

  async function confirmWay() {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      await client.triage.joinFromPatient({
        clinicId: confirm.id,
        etaMinutesFromNow: minutes,
      });
      setEnRouteId(confirm.id);
      setConfirm(null);
      toast.show({
        variant: "success",
        label: `${confirm.name} was notified. You’re on their inbound queue.`,
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

  return (
    <View className="flex-1 bg-background">
      {Platform.OS === "web" ? (
        <View className="flex-1 bg-surface-secondary" />
      ) : (
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={LAHORE_REGION}
          showsUserLocation={Boolean(origin)}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {clinics.map((clinic) => (
            <Marker
              key={clinic.id}
              coordinate={{ latitude: clinic.latitude, longitude: clinic.longitude }}
              title={clinic.name}
              pinColor={clinic.id === selectedId ? palette.tertiary : palette.primary}
              onPress={() => selectClinic(clinic)}
            />
          ))}
        </MapView>
      )}

      <View className="absolute left-4 right-4 top-3 z-10">
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

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: surface, borderRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: muted, width: 40 }}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
          <Text className="text-[20px] font-bold text-foreground tracking-tight">Nearby Clinics</Text>
          {locationDenied ? (
            <Text className="mt-1 text-[13px] leading-5 text-muted">
              Turn on location to rank clinics by distance. Search still works.
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
                  enRoute={enRouteId === clinic.id}
                  onSelect={() => selectClinic(clinic)}
                  onWay={() => openWay(clinic)}
                />
              ))}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <OnTheWaySheet
        open={confirm != null}
        clinicName={confirm?.name ?? ""}
        minutes={minutes}
        busy={busy}
        onChangeMinutes={setMinutes}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        onConfirm={() => void confirmWay()}
      />
    </View>
  );
}
