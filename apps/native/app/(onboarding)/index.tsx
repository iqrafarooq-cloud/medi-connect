import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "heroui-native";

import { BrandMark } from "@/components/brand-mark";
import { PrimaryButton } from "@/components/primary-button";
import { authClient } from "@/lib/auth-client";
import { setOnboardingComplete } from "@/lib/onboarding";
import { palette } from "@/theme";

const slides = [
  {
    icon: "shield-checkmark" as const,
    title: "5-tier triage intelligence",
    body: "Symptoms are classified as Low, Moderate, Medium, High, or Critical so you know how urgently to act.",
  },
  {
    icon: "people" as const,
    title: "Physician escalation",
    body: "When you need a human, MediConnect hands you from symptom check to the queue to a live consult.",
  },
  {
    icon: "calendar" as const,
    title: "Records, by the day they happened",
    body: "Filter lab results and past encounters by exact date — a longitudinal view of your care.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: session, isPending } = authClient.useSession();
  const muted = useThemeColor("muted");
  const foreground = useThemeColor("foreground");
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  async function finish() {
    await setOnboardingComplete();
    router.replace("/(auth)/sign-up");
  }

  if (!isPending && session?.user) {
    return <Redirect href="/(app)" />;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-row items-center justify-between px-3 h-12">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={foreground} />
        </Pressable>
        <BrandMark size={36} />
        <Pressable
          onPress={() => void finish()}
          hitSlop={8}
          className="px-2"
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text className="text-primary font-medium text-base">Skip</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View
          className="mb-8 h-28 w-28 items-center justify-center rounded-full"
          style={{ backgroundColor: `${palette.secondary}22` }}
        >
          <Ionicons name={slide.icon} size={44} color={palette.primary} />
        </View>
        <Text className="text-center font-bold text-3xl text-foreground tracking-tight mb-3">
          {slide.title}
        </Text>
        <Text className="text-center text-base text-muted leading-6">{slide.body}</Text>
      </View>

      <View className="px-6 pb-4">
        <View className="flex-row justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <View
              key={i}
              className="h-2 rounded-full"
              style={{
                width: i === index ? 22 : 8,
                backgroundColor: i === index ? palette.primary : muted,
              }}
            />
          ))}
        </View>
        <PrimaryButton
          size="lg"
          onPress={() => {
            if (isLast) {
              void finish();
              return;
            }
            setIndex((current) => current + 1);
          }}
        >
          <PrimaryButton.Label>{isLast ? "Create account" : "Next"}</PrimaryButton.Label>
        </PrimaryButton>
      </View>
    </View>
  );
}
