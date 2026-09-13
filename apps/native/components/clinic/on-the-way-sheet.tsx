import { Spinner } from "heroui-native";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/primary-button";
import { palette } from "@/theme";

export function OnTheWaySheet({
  open,
  clinicName,
  minutes,
  busy,
  onChangeMinutes,
  onClose,
  onConfirm,
}: {
  open: boolean;
  clinicName: string;
  minutes: number;
  busy: boolean;
  onChangeMinutes: (value: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!open) return null;

  function bump(delta: number) {
    onChangeMinutes(Math.min(24 * 60, Math.max(0, minutes + delta)));
  }

  return (
    <Pressable className="absolute inset-0 z-20 justify-end bg-black/40" onPress={busy ? undefined : onClose}>
      <Pressable
        className="rounded-t-3xl bg-surface px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        onPress={() => undefined}
      >
        <View className="mb-3 items-center">
          <View className="h-1 w-10 rounded-full bg-border" />
        </View>
        <Text className="text-[20px] font-bold text-foreground tracking-tight">On the way</Text>
        <Text className="mt-1 text-[15px] leading-6 text-muted">
          Confirm how many minutes until you reach {clinicName}. The clinic will see you on its inbound queue.
        </Text>

        <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-surface-secondary px-3 py-2">
          <Pressable
            onPress={() => bump(-5)}
            className="h-11 w-11 items-center justify-center rounded-xl bg-surface"
            accessibilityRole="button"
            accessibilityLabel="Five minutes less"
          >
            <Text className="text-[20px] font-semibold text-foreground">−</Text>
          </Pressable>
          <View className="flex-row items-end gap-1">
            <TextInput
              value={String(minutes)}
              onChangeText={(value) => {
                const next = Number(value.replace(/[^\d]/g, ""));
                if (Number.isNaN(next)) return;
                onChangeMinutes(Math.min(24 * 60, next));
              }}
              keyboardType="number-pad"
              className="min-w-[64px] text-center text-[32px] font-bold text-foreground"
              accessibilityLabel="Minutes until arrival"
            />
            <Text className="mb-1.5 text-[14px] font-medium text-muted">min</Text>
          </View>
          <Pressable
            onPress={() => bump(5)}
            className="h-11 w-11 items-center justify-center rounded-xl bg-surface"
            accessibilityRole="button"
            accessibilityLabel="Five minutes more"
          >
            <Text className="text-[20px] font-semibold text-foreground">+</Text>
          </Pressable>
        </View>

        <View className="mt-4">
          <PrimaryButton size="lg" onPress={onConfirm} isDisabled={busy}>
            {busy ? <Spinner size="sm" color="default" /> : <PrimaryButton.Label>Notify clinic</PrimaryButton.Label>}
          </PrimaryButton>
        </View>
        <Pressable className="mt-2 h-11 items-center justify-center" onPress={onClose} disabled={busy}>
          <Text className="text-[15px] font-semibold" style={{ color: palette.neutral }}>
            Cancel
          </Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}
