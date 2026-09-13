import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { formatQueueStatus } from "@/lib/clinic-map";
import { palette } from "@/theme";

export function QueueStatusCard({
  clinicName,
  minutesLeft,
}: {
  clinicName: string;
  minutesLeft: number;
}) {
  return (
    <View
      className="mx-4 overflow-hidden rounded-2xl px-4 py-3.5"
      style={{ backgroundColor: palette.primary }}
      accessibilityRole="summary"
      accessibilityLabel={formatQueueStatus(clinicName)}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
        >
          <Ionicons name="checkmark" size={22} color={palette.white} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[16px] font-bold text-primary-foreground tracking-tight">
            {formatQueueStatus(clinicName)}
          </Text>
          <Text className="mt-0.5 text-[13px] leading-5" style={{ color: "rgba(255,255,255,0.82)" }}>
            {minutesLeft > 0
              ? `The clinic can see you inbound · ${minutesLeft} min ETA`
              : "The clinic can see you inbound · arriving now"}
          </Text>
        </View>
      </View>
    </View>
  );
}
