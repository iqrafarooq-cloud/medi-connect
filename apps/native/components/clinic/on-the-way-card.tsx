import { clampEtaMinutes } from "@medi-connect/api/lib/health-remedy";
import { Pressable, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { palette } from "@/theme";

export function OnTheWayCard({
  clinicName,
  minutes,
  busy,
  onChangeMinutes,
  onClose,
  onConfirm,
}: {
  clinicName: string;
  minutes: number;
  busy: boolean;
  onChangeMinutes: (value: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  function bump(delta: number) {
    onChangeMinutes(clampEtaMinutes(minutes + delta));
  }

  return (
    <View className="rounded-2xl border border-border bg-surface px-4 py-4">
      <Text className="text-[18px] font-bold text-foreground tracking-tight">On the way</Text>
      <Text className="mt-1 text-[15px] leading-6 text-muted">
        How many minutes until you reach {clinicName}? Use 1 to 200 minutes.
      </Text>

      <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-surface-secondary px-3 py-2">
        <Pressable
          onPress={() => bump(-1)}
          className="h-11 w-11 items-center justify-center rounded-xl bg-surface"
          accessibilityRole="button"
          accessibilityLabel="One minute less"
        >
          <Text className="text-[20px] font-semibold text-foreground">−</Text>
        </Pressable>
        <View className="flex-row items-end gap-1">
          <TextInput
            value={String(minutes)}
            onChangeText={(value) => {
              const digits = value.replace(/[^\d]/g, "");
              if (digits === "") {
                onChangeMinutes(1);
                return;
              }
              onChangeMinutes(clampEtaMinutes(Number(digits)));
            }}
            keyboardType="number-pad"
            className="min-w-[64px] text-center text-[28px] font-bold text-foreground"
            accessibilityLabel="Minutes until arrival"
          />
          <Text className="mb-1.5 text-[14px] font-medium text-muted">min</Text>
        </View>
        <Pressable
          onPress={() => bump(1)}
          className="h-11 w-11 items-center justify-center rounded-xl bg-surface"
          accessibilityRole="button"
          accessibilityLabel="One minute more"
        >
          <Text className="text-[20px] font-semibold text-foreground">+</Text>
        </Pressable>
      </View>

      <View className="mt-4">
        <PrimaryButton size="lg" onPress={onConfirm} isLoading={busy}>
          <PrimaryButton.Label>Notify clinic</PrimaryButton.Label>
        </PrimaryButton>
      </View>
      <Pressable className="mt-2 h-11 items-center justify-center" onPress={onClose} disabled={busy}>
        <Text className="text-[15px] font-semibold" style={{ color: palette.neutral }}>
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}
