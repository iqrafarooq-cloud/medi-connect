import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { palette } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Suggestion = { kind: string; title: string; detail: string };

const KIND_ICON: Record<string, IconName> = {
  rest: "bed-outline",
  movement: "walk-outline",
  hydration: "water-outline",
  nutrition: "restaurant-outline",
  sleep: "moon-outline",
};

const KIND_LABEL: Record<string, string> = {
  rest: "Rest",
  movement: "Movement",
  hydration: "Fluids",
  nutrition: "Food",
  sleep: "Sleep",
};

export function RemedyCards({
  last,
  onStart,
}: {
  last: {
    severity: "self_care" | "watch" | "severe";
    summary: string;
    suggestions: Suggestion[];
  } | null;
  onStart: () => void;
}) {
  const plan =
    last && last.severity !== "severe" && last.suggestions.length > 0
      ? last.suggestions.slice(0, 3)
      : [];

  return (
    <View className="mt-5">
      <View className="overflow-hidden rounded-2xl border border-border bg-surface px-4 py-4">
        <View className="flex-row items-start gap-3">
          <View
            className="h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
          >
            <Ionicons name="pulse" size={20} color={palette.primary} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[17px] font-bold text-foreground tracking-tight">Feeling Unwell?</Text>
            <Text className="mt-1 text-[13px] leading-5 text-muted">
              Check your symptoms for self-care advice or find a clinic if needed.
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onStart}
          className="mt-4 h-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: palette.primary }}
          accessibilityRole="button"
          accessibilityLabel="Start check"
        >
          <Text className="text-[15px] font-semibold text-primary-foreground">Start Check</Text>
        </Pressable>
      </View>

      {plan.length > 0 ? (
        <View className="mt-5">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">Your plan</Text>
          <Text className="mt-1 text-[13px] leading-5 text-muted">{last?.summary}</Text>
          <View className="mt-3 gap-2.5">
            {plan.map((item) => (
              <View key={`${item.kind}:${item.title}`} className="flex-row items-start gap-3">
                <View
                  className="mt-0.5 h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
                >
                  <Ionicons name={KIND_ICON[item.kind] ?? "leaf-outline"} size={16} color={palette.primary} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-foreground">{item.title}</Text>
                  <Text className="mt-0.5 text-[12px] leading-4 text-muted" numberOfLines={2}>
                    {item.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : last?.severity === "severe" ? (
        <Text className="mt-3 text-[13px] leading-5 text-muted">
          Your last check needed clinic care. Open Clinic to find a nearby enrolled facility.
        </Text>
      ) : null}
    </View>
  );
}

export function RemedySuggestionList({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <View className="gap-3">
      {suggestions.map((item) => (
        <View key={`${item.kind}:${item.title}`} className="rounded-2xl border border-border bg-surface px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
            >
              <Ionicons name={KIND_ICON[item.kind] ?? "leaf-outline"} size={18} color={palette.primary} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[12px] font-semibold text-muted">
                {KIND_LABEL[item.kind] ?? item.kind}
              </Text>
              <Text className="mt-0.5 text-[16px] font-semibold text-foreground">{item.title}</Text>
            </View>
          </View>
          <Text className="mt-2.5 text-[14px] leading-5 text-muted">{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}
