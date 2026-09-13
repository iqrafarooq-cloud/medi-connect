import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { CATEGORY_UI } from "@/components/health/category-ui";
import type { RecordType } from "@/lib/health-feed";

export function RecordRow({
  title,
  meta,
  status,
  danger,
  type,
  onPress,
}: {
  title: string;
  meta: string;
  status?: string | null;
  danger?: boolean;
  type?: RecordType;
  onPress: () => void;
}) {
  const muted = useThemeColor("muted");
  const ui = type ? CATEGORY_UI[type] : null;

  return (
    <Pressable
      onPress={onPress}
      className="min-h-[64px] flex-row items-center rounded-2xl border border-border bg-surface px-3 py-3"
      accessibilityRole="button"
    >
      {ui ? (
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: ui.tint }}
        >
          <Ionicons name={ui.icon} size={18} color={ui.ink} />
        </View>
      ) : null}
      <View className={`min-w-0 flex-1 pr-3 ${ui ? "ml-3" : ""}`}>
        <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text className={`mt-0.5 text-xs ${danger ? "text-danger" : "text-muted"}`} numberOfLines={1}>
          {status ? `${meta} · ${status}` : meta}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={muted} />
    </Pressable>
  );
}
