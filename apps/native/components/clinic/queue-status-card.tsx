import { Ionicons } from "@expo/vector-icons";
import { cn } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { formatQueueStatus } from "@/lib/clinic-map";
import { palette } from "@/theme";

export function QueueStatusCard({
  clinicName,
  minutesLeft,
  className,
  onPress,
  onLeave,
  leaving,
}: {
  clinicName: string;
  minutesLeft: number;
  className?: string;
  onPress?: () => void;
  onLeave?: () => void;
  leaving?: boolean;
}) {
  return (
    <View
      className={cn("overflow-hidden rounded-2xl px-4 py-3.5", className ?? "mx-4")}
      style={{ backgroundColor: palette.primary }}
      accessibilityRole="summary"
      accessibilityLabel={formatQueueStatus(clinicName)}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : "none"}
        accessibilityLabel={onPress ? `Open clinic map for ${clinicName}` : undefined}
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
      </Pressable>
      {onLeave ? (
        <Pressable
          onPress={onLeave}
          disabled={leaving}
          className="mt-3 h-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "rgba(255,255,255,0.16)",
            opacity: leaving ? 0.55 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Leave the queue at ${clinicName}`}
        >
          <Text className="text-[15px] font-semibold text-primary-foreground">
            {leaving ? "Leaving…" : "Leave queue"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
