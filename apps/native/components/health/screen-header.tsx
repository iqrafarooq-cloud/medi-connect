import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
};

export function ScreenHeader({ title, subtitle, onBack, right, large }: Props) {
  const insets = useSafeAreaInsets();
  const foreground = useThemeColor("foreground");

  if (large) {
    return (
      <View style={{ paddingTop: insets.top + 4 }} className="bg-background px-4 pb-3">
        <View className="h-11 flex-row items-center justify-between">
          {onBack ? (
            <Pressable
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={foreground} />
            </Pressable>
          ) : (
            <View className="h-10 w-10" />
          )}
          {right ?? <View className="h-10 w-10" />}
        </View>
        <Text className="mt-3 font-bold text-[30px] text-foreground tracking-tight">{title}</Text>
        {subtitle ? <Text className="mt-1 text-[14px] leading-5 text-muted">{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="px-1">
      <View className="h-11 flex-row items-center">
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={foreground} />
          </Pressable>
        ) : (
          <View className="w-11" />
        )}
        <Text className="flex-1 text-center font-semibold text-base text-foreground">{title}</Text>
        <View className="h-11 w-11 items-center justify-center">{right}</View>
      </View>
    </View>
  );
}

export function HeaderIconButton({
  icon,
  label,
  onPress,
  emphasis,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  emphasis?: boolean;
}) {
  const foreground = useThemeColor("foreground");
  return (
    <Pressable
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: emphasis ? palette.primary : undefined }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={emphasis ? palette.white : foreground} />
    </Pressable>
  );
}
