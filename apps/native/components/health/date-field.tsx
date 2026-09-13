import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { formatHealthDate, fromIsoDate, toIsoDate } from "@/lib/health";

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function onPick(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setOpen(false);
    if (date) onChange(toIsoDate(date));
  }

  return (
    <View className="mt-4">
      <Text className="mb-1.5 text-sm font-medium text-foreground">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-12 justify-center rounded-xl border border-border bg-surface px-3"
        accessibilityRole="button"
      >
        <Text className="text-[15px] text-foreground">{formatHealthDate(value)}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={fromIsoDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPick}
          maximumDate={new Date()}
        />
      ) : null}
      {open && Platform.OS === "ios" ? (
        <Pressable onPress={() => setOpen(false)} className="mt-1 self-end">
          <Text className="text-sm font-medium text-primary">Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
