import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { formatPakistanPhone } from "@/lib/pakistan";
import { palette } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Suggestion = { kind: string; title: string; detail: string };
type Clinic = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  distanceKm: number | null;
};

const KIND_ICON: Record<string, IconName> = {
  rest: "bed-outline",
  movement: "walk-outline",
  hydration: "water-outline",
  nutrition: "restaurant-outline",
  sleep: "moon-outline",
};

function callClinic(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  void Linking.openURL(`tel:${digits}`);
}

export function RemedyCards({
  last,
  clinics,
  onStart,
}: {
  last: {
    severity: "self_care" | "watch" | "severe";
    summary: string;
    suggestions: Suggestion[];
  } | null;
  clinics: Clinic[];
  onStart: () => void;
}) {
  const clinic = clinics[0] ?? null;

  return (
    <View className="mt-3 gap-3">
      <Pressable
        onPress={onStart}
        className="flex-row items-center overflow-hidden rounded-2xl border border-border bg-surface px-4 py-4"
        accessibilityRole="button"
        accessibilityLabel="Start remedial measure"
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(0, 168, 150, 0.14)" }}
        >
          <Ionicons name="leaf" size={20} color={palette.secondary} />
        </View>
        <View className="ml-3 min-w-0 flex-1 pr-3">
          <Text className="text-[16px] font-bold text-foreground tracking-tight">Remedial measure</Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-muted">
            Ten questions. Rest, movement, and fluids — never medicine.
          </Text>
        </View>
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: palette.primary }}
        >
          <Ionicons name="add" size={24} color={palette.white} />
        </View>
      </Pressable>

      <View className="overflow-hidden rounded-2xl border border-border bg-surface px-4 py-4">
        <Text className="text-[16px] font-bold text-foreground tracking-tight">Your plan</Text>
        {last && last.severity !== "severe" && last.suggestions.length > 0 ? (
          <View className="mt-3 gap-3">
            <Text className="text-[13px] leading-5 text-muted">{last.summary}</Text>
            {last.suggestions.slice(0, 3).map((item) => (
              <View key={`${item.kind}:${item.title}`} className="flex-row items-start gap-3">
                <View
                  className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg"
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
        ) : (
          <Text className="mt-1.5 text-[13px] leading-5 text-muted">
            {last?.severity === "severe"
              ? "Your last check needed clinic care. Use the card below."
              : "After a check, rest and movement tips land here."}
          </Text>
        )}
      </View>

      <View
        className="overflow-hidden rounded-2xl border border-border bg-surface px-4 py-4"
        style={
          clinic
            ? { borderColor: "rgba(230, 57, 70, 0.28)", backgroundColor: "rgba(230, 57, 70, 0.06)" }
            : undefined
        }
      >
        <Text className="text-[16px] font-bold text-foreground tracking-tight">Nearby clinic</Text>
        {clinic ? (
          <View className="mt-2">
            <Text className="text-[15px] font-semibold text-foreground">{clinic.name}</Text>
            <Text className="mt-0.5 text-[13px] leading-5 text-muted">
              {clinic.address}, {clinic.city}
              {clinic.distanceKm != null ? ` · ${clinic.distanceKm} km` : ""}
            </Text>
            <Pressable
              onPress={() => callClinic(clinic.phone)}
              className="mt-3 h-11 flex-row items-center justify-center rounded-xl"
              style={{ backgroundColor: palette.tertiary }}
              accessibilityRole="button"
              accessibilityLabel={`Call ${clinic.name}`}
            >
              <Ionicons name="call" size={16} color={palette.white} />
                <Text className="ml-2 text-[15px] font-semibold text-tertiary-foreground">
                  Call {formatPakistanPhone(clinic.phone)}
                </Text>
            </Pressable>
          </View>
        ) : (
          <Text className="mt-1.5 text-[13px] leading-5 text-muted">
            If a check looks serious, a verified clinic and phone number appear here.
          </Text>
        )}
      </View>
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
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
            >
              <Ionicons name={KIND_ICON[item.kind] ?? "leaf-outline"} size={18} color={palette.primary} />
            </View>
            <Text className="flex-1 text-[16px] font-semibold text-foreground">{item.title}</Text>
          </View>
          <Text className="mt-2 text-[14px] leading-5 text-muted">{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}

export function RemedyClinicCard({ clinic }: { clinic: Clinic }) {
  return (
    <View className="rounded-2xl border border-border bg-surface px-4 py-4">
      <Text className="text-[16px] font-semibold text-foreground">{clinic.name}</Text>
      <Text className="mt-1 text-[13px] leading-5 text-muted">
        {clinic.address}, {clinic.city}
        {clinic.distanceKm != null ? ` · ${clinic.distanceKm} km` : ""}
      </Text>
      <Pressable
        onPress={() => callClinic(clinic.phone)}
        className="mt-3 h-11 flex-row items-center justify-center rounded-xl"
        style={{ backgroundColor: palette.tertiary }}
        accessibilityRole="button"
        accessibilityLabel={`Call ${clinic.name}`}
      >
        <Ionicons name="call" size={16} color={palette.white} />
        <Text className="ml-2 text-[15px] font-semibold text-tertiary-foreground">
          Call {formatPakistanPhone(clinic.phone)}
        </Text>
      </Pressable>
    </View>
  );
}
