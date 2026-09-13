import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp, FadeOut, FadeOutDown } from "react-native-reanimated";

import { ADD_ACTIONS, type AddAction } from "@/components/health/add-sheet";
import { fonts, palette } from "@/theme";

export function HealthAddFab({ onSelect }: { onSelect: (id: AddAction) => void }) {
  const [open, setOpen] = useState(false);

  function toggle() {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setOpen((value) => !value);
  }

  function pick(id: AddAction) {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setOpen(false);
    onSelect(id);
  }

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      {open ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} className="absolute inset-0">
          <Pressable className="absolute inset-0 bg-black/25" onPress={() => setOpen(false)} />
        </Animated.View>
      ) : null}

      <View className="absolute right-4 bottom-5 items-end" pointerEvents="box-none">
        {open ? (
          <View className="mb-3 items-end gap-2.5">
            {ADD_ACTIONS.map((action, index) => (
              <Animated.View
                key={action.id}
                entering={FadeInUp.delay((ADD_ACTIONS.length - 1 - index) * 35).duration(180)}
                exiting={FadeOutDown.duration(120)}
              >
                <Pressable
                  onPress={() => pick(action.id)}
                  className="flex-row items-center"
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View className="mr-3 rounded-full bg-surface px-3.5 py-2">
                    <Text className="text-[14px] font-semibold text-foreground">{action.label}</Text>
                  </View>
                  <View
                    className="h-11 w-11 items-center justify-center rounded-full bg-surface"
                    style={{
                      shadowColor: palette.neutral,
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 4,
                    }}
                  >
                    <Ionicons name={action.icon} size={20} color={palette.primary} />
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={open ? "Close add record" : "Add record"}
          className="flex-row items-center justify-center overflow-hidden"
          style={{
            height: 56,
            minWidth: 56,
            borderRadius: 28,
            backgroundColor: palette.primary,
            paddingHorizontal: open ? 18 : 0,
            shadowColor: palette.primary,
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Ionicons name={open ? "close" : "add"} size={26} color={palette.white} />
          {open ? (
            <Text
              style={{
                fontFamily: fonts.headlineBold,
                fontSize: 16,
                color: palette.white,
                marginLeft: 8,
              }}
            >
              Add record
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
