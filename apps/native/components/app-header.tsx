import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import { Alert, Linking, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "@/components/brand-mark";
import { useAppTheme } from "@/contexts/app-theme-context";
import { fonts, palette } from "@/theme";

const SOS_RED = "#DC2626";
const SOS_NUMBER = "1122";
const PROFILE_TEAL = "#0D4A52";
const WORDMARK = "#0E6251";

function haptic(style: Haptics.ImpactFeedbackStyle | "warning") {
  if (Platform.OS === "web") return;
  if (style === "warning") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  void Haptics.impactAsync(style);
}

export function TabAppHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/health/")) return null;
  return <AppHeader />;
}

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useAppTheme();

  function openProfile() {
    haptic(Haptics.ImpactFeedbackStyle.Light);
    router.navigate("/(app)/profile");
  }

  function openSos() {
    haptic("warning");
    Alert.alert("Call emergency services?", "This will open Rescue 1122 on your phone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call 1122",
        style: "destructive",
        onPress: () => {
          void Linking.openURL(`tel:${SOS_NUMBER}`);
        },
      },
    ]);
  }

  return (
    <View style={{ paddingTop: insets.top + 6 }} className="bg-background px-4 pb-3">
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5 pr-2">
          <BrandMark size={44} />
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.headlineBold,
              fontSize: 16,
              letterSpacing: 1.4,
              fontWeight: "700",
              color: isDark ? palette.secondary : WORDMARK,
            }}
          >
            MEDICONNECT
          </Text>
        </View>

        <View className="flex-row items-center gap-2.5">
          <Pressable
            onPress={openSos}
            accessibilityRole="button"
            accessibilityLabel="Emergency SOS, call Rescue 1122"
            className="h-12 flex-row items-center rounded-full px-4"
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#B91C1C" : SOS_RED,
              shadowColor: SOS_RED,
              shadowOpacity: 0.45,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <MaterialCommunityIcons name="alarm-light" size={18} color={palette.white} />
            <Text
              style={{
                fontFamily: fonts.headlineBold,
                fontSize: 16,
                letterSpacing: 0.3,
                color: palette.white,
                marginLeft: 6,
              }}
            >
              SOS
            </Text>
          </Pressable>

          <Pressable
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            className="h-11 w-11 items-center justify-center rounded-full"
            style={({ pressed }) => ({
              backgroundColor: PROFILE_TEAL,
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Ionicons name="person" size={20} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
