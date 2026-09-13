import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import { palette } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function ComingNextChip() {
  return (
    <View className="self-start rounded-full bg-secondary/15 px-2 py-0.5">
      <Text className="text-primary text-[11px] font-medium">Coming next</Text>
    </View>
  );
}

export function ActionRow({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-4">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Ionicons name={icon} size={20} color={palette.primary} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-semibold text-[15px] text-foreground flex-1">{title}</Text>
          <ComingNextChip />
        </View>
        <Text className="mt-1 text-sm leading-5 text-muted">{body}</Text>
      </View>
    </View>
  );
}

export function EmptyPanel({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Ionicons name={icon} size={28} color={palette.primary} />
      </View>
      <Text className="text-center font-semibold text-xl text-foreground">{title}</Text>
      <Text className="mt-2 text-center text-[15px] leading-6 text-muted">{body}</Text>
      <View className="mt-4">
        <ComingNextChip />
      </View>
    </View>
  );
}
