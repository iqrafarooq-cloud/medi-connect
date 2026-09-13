import { type ReactNode } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";

const HEADER_ROW = 44;

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  title?: string;
};

export function KeyboardFormShell({ children, footer, onBack, title }: Props) {
  const insets = useSafeAreaInsets();
  const foreground = useThemeColor("foreground");
  const pageMinHeight =
    (initialWindowMetrics?.frame.height ?? Dimensions.get("window").height) - insets.top - HEADER_ROW;

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top }} className="px-1">
        <View className="h-11 flex-row items-center">
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              className="h-11 w-11 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color={foreground} />
            </Pressable>
          ) : (
            <View className="w-11" />
          )}
          {title ? (
            <Text className="flex-1 text-center font-semibold text-base text-foreground pr-11">
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          minHeight: pageMinHeight,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={28}
        extraKeyboardSpace={16}
      >
        <View style={{ flexGrow: 1 }}>{children}</View>
        {footer ? (
          <View
            className="mt-3 border-t border-border bg-background pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 10) }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}
