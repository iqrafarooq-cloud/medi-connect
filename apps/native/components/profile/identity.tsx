import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";
import { initialsFromName, profileStatsLine } from "@/lib/profile";
import { palette } from "@/theme";

export function ProfileIdentity({
  name,
  email,
  stats,
}: {
  name: string;
  email: string;
  stats: { records: number; visits: number; checks: number } | null;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-3.5">
        <View
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(5, 150, 105, 0.16)" }}
          accessibilityLabel={`${name} avatar`}
        >
          <Text className="font-bold text-[22px] tracking-tight" style={{ color: palette.primary }}>
            {initialsFromName(name)}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[22px] leading-7 text-foreground tracking-tight" numberOfLines={2}>
            {name}
          </Text>
          <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>
            {email}
          </Text>
          {stats ? (
            <Text className="mt-1.5 text-[13px] font-medium text-muted">
              {profileStatsLine(stats)}
            </Text>
          ) : null}
        </View>
      </View>
      <ThemeToggle />
    </View>
  );
}

export function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-7">
      <Text className="mb-2 px-1 font-semibold text-[17px] text-foreground tracking-tight">{title}</Text>
      {children}
    </View>
  );
}

export function GroupedList({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</View>;
}

export function IconWell({
  icon,
  tint,
  ink,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
  ink: string;
}) {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: tint }}>
      <Ionicons name={icon} size={18} color={ink} />
    </View>
  );
}
