import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  title?: string;
};

export function KeyboardFormShell({ children, footer, onBack, title }: Props) {
  const insets = useSafeAreaInsets();
  const foreground = useThemeColor("foreground");

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top }} className="px-2">
        <View className="h-12 flex-row items-center">
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
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: footer ? 16 : 24,
        }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        extraKeyboardSpace={12}
      >
        {children}
      </KeyboardAwareScrollView>

      {footer ? (
        <KeyboardStickyView offset={{ closed: 0, opened: 8 }}>
          <View
            className="border-t border-border bg-background px-6 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            {footer}
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}
