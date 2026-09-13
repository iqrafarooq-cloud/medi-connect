import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useThemeColor } from "heroui-native";
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
  const muted = useThemeColor("muted");

  function onPick(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setOpen(false);
    if (date) onChange(toIsoDate(date));
  }

  return (
    <View className="mt-4">
      <Text className="mb-1.5 text-[13px] font-semibold text-foreground">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-12 flex-row items-center rounded-xl border border-border bg-surface px-3"
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="calendar-outline" size={18} color={muted} />
        <Text className="ml-2.5 flex-1 text-[15px] text-foreground">{formatHealthDate(value)}</Text>
        <Ionicons name="chevron-down" size={16} color={muted} />
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
