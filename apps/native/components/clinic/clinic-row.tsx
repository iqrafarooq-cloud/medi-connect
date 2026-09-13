import { Ionicons } from "@expo/vector-icons";
import type { NearbyClinic } from "@medi-connect/api/lib/health-remedy";
import { Pressable, Text, View } from "react-native";

import { clinicQueueButton, formatClinicDistance } from "@/lib/clinic-map";
import { palette } from "@/theme";

export function ClinicRow({
  clinic,
  selected,
  queuedClinicId,
  onSelect,
  onWay,
}: {
  clinic: NearbyClinic;
  selected: boolean;
  queuedClinicId: string | null;
  onSelect: () => void;
  onWay: () => void;
}) {
  const distance = formatClinicDistance(clinic.distanceKm);
  const action = clinicQueueButton(clinic.id, queuedClinicId);
  const label =
    action === "here" ? "In this queue" : action === "blocked" ? "Already in a queue" : "On the way";

  return (
    <Pressable
      onPress={onSelect}
      className="rounded-2xl border bg-surface px-4 py-3.5"
      style={{
        borderColor: selected ? palette.primary : "rgba(27, 40, 48, 0.08)",
      }}
      accessibilityRole="button"
      accessibilityLabel={clinic.name}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
        >
          <Ionicons
            name={clinic.type === "hospital" ? "business-outline" : "medkit-outline"}
            size={20}
            color={palette.primary}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">{clinic.name}</Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-muted" numberOfLines={2}>
            {distance ? `${distance} · ` : ""}
            {clinic.address}, {clinic.city}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onWay}
        disabled={action !== "join"}
        className="mt-3 h-11 items-center justify-center rounded-xl"
        style={{
          backgroundColor: action === "join" ? palette.primary : "rgba(5, 150, 105, 0.16)",
        }}
        accessibilityRole="button"
        accessibilityLabel={
          action === "here"
            ? `In the queue at ${clinic.name}`
            : action === "blocked"
              ? "Already in another clinic queue"
              : `On the way to ${clinic.name}`
        }
      >
        <Text
          className="text-[15px] font-semibold"
          style={{ color: action === "join" ? palette.white : palette.primary }}
        >
          {label}
        </Text>
      </Pressable>
    </Pressable>
  );
}
