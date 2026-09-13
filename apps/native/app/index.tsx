import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "heroui-native";

import { BrandMark } from "@/components/brand-mark";
import { PrimaryButton } from "@/components/primary-button";
import { palette } from "@/theme";

const features = [
  {
    icon: "shield-checkmark-outline" as const,
    title: "5-Tier Triage Intelligence",
    body: "Low, Moderate, Medium, High & Critical classification",
  },
  {
    icon: "people-outline" as const,
    title: "HITL Physician Escalation",
    body: "Seamless Symptom → Queue → Consult video handoff",
  },
  {
    icon: "calendar-outline" as const,
    title: "Calendar Longitudinal Records",
    body: "Filter lab results and past encounters by exact date",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View className="items-center mb-6">
          <BrandMark size={72} />
          <View className="mt-5 rounded-full bg-secondary/20 px-3 py-1">
            <Text
              className="text-primary font-medium text-[11px]"
              style={{ letterSpacing: 1.4 }}
            >
              NEXT-GEN CLINICAL TRIAGE
            </Text>
          </View>
          <Text className="mt-3 font-bold text-4xl text-foreground tracking-tight">MediConnect</Text>
          <Text className="mt-2 text-center text-[15px] leading-6 text-muted px-2">
            Instant AI clinical guidance, live emergency routing, and human-in-the-loop telehealth
            consults.
          </Text>
        </View>

        <View className="gap-3">
          {features.map((feature) => (
            <View
              key={feature.title}
              className="flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-4"
              style={{
                shadowColor: palette.neutral,
                shadowOpacity: 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name={feature.icon} size={20} color={palette.primary} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-[15px] text-foreground">{feature.title}</Text>
                <Text className="mt-0.5 text-sm leading-5 text-muted">{feature.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="px-6 gap-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <PrimaryButton size="lg" onPress={() => router.push("/(onboarding)")}>
          <PrimaryButton.Label>Create New Patient Account →</PrimaryButton.Label>
        </PrimaryButton>
        <Button size="lg" variant="outline" onPress={() => router.push("/(auth)/sign-in")}>
          <Button.Label>Log In to Existing Account</Button.Label>
        </Button>
      </View>
    </View>
  );
}
