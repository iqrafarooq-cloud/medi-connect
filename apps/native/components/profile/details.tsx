import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import { IconWell } from "@/components/profile/identity";
import { palette } from "@/theme";

export function ProfileDetailRow({
  icon,
  label,
  value,
  last,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-3 px-4 py-3 ${last ? "" : "border-b border-border"}`}>
      <IconWell icon={icon} tint="rgba(5, 150, 105, 0.12)" ink={palette.primary} />
      <View className="min-w-0 flex-1">
        <Text className="text-[12px] font-medium text-muted">{label}</Text>
        <Text className="mt-0.5 text-[15px] text-foreground" numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}
