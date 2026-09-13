import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-10 shrink-0 items-center justify-center rounded-full px-4 ${
        active ? "bg-primary" : "border border-border bg-surface"
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text className={`text-[14px] font-semibold ${active ? "text-primary-foreground" : "text-foreground"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}

export function ChipScroller({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center gap-2 px-4 py-1">{children}</View>
    </ScrollView>
  );
}

export function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View className="flex-row rounded-xl bg-surface-secondary p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`h-9 flex-1 items-center justify-center rounded-lg ${active ? "bg-surface" : ""}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text className={`text-[13px] font-medium ${active ? "text-foreground" : "text-muted"}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
