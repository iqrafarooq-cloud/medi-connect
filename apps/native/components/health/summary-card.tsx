import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CATEGORY_UI } from "@/components/health/category-ui";
import { formatHealthDate } from "@/lib/health";
import type { RecordType } from "@/lib/health-feed";
import { palette } from "@/theme";

type Count = {
  key: string;
  label: string;
  count: number;
  filter: RecordType;
  preview: string | null;
};

type Recent = {
  id: string;
  title: string;
  at: string;
  status: "ready" | "processing" | "failed" | null;
  detailKind: RecordType;
  detailId: string;
};

export function HealthSummaryCard({
  counts,
  recent,
  onShowAll,
  onPressCount,
  onPressRecent,
}: {
  counts: Count[];
  recent: Recent[];
  onShowAll: () => void;
  onPressCount: (filter: RecordType) => void;
  onPressRecent: (item: Recent) => void;
}) {
  const muted = useThemeColor("muted");
  const foreground = useThemeColor("foreground");
  const empty = counts.every((item) => item.count === 0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RecordType>(() => {
    const withItems = counts.find((item) => item.count > 0);
    return withItems?.filter ?? "condition";
  });

  const current = counts.find((item) => item.filter === selected) ?? counts[0];
  const ui = current ? CATEGORY_UI[current.filter] : CATEGORY_UI.condition;
  const ink = current?.filter === "document" ? foreground : ui.ink;
  const latest = useMemo(
    () => recent.filter((item) => item.detailKind === "document").slice(0, 2),
    [recent],
  );

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
        >
          <Ionicons name="heart" size={20} color={palette.primary} />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-[17px] text-foreground tracking-tight">Health record</Text>
          <Text className="mt-0.5 text-[13px] text-muted">
            {empty ? "Nothing on file yet" : "Choose a section to open"}
          </Text>
        </View>
      </View>

      <View className="border-t border-border px-3 py-3">
        <Pressable
          onPress={() => setOpen((value) => !value)}
          className="min-h-[56px] flex-row items-center rounded-xl border border-border bg-background px-3"
          accessibilityRole="button"
          accessibilityLabel="Chart section"
          accessibilityState={{ expanded: open }}
        >
          {current ? (
            <>
              <View
                className="h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: ui.tint }}
              >
                <Ionicons name={ui.icon} size={18} color={ink} />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[15px] font-semibold text-foreground">{current.label}</Text>
                <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
                  {current.preview ?? ui.hint}
                </Text>
              </View>
              <View
                className="mr-1 min-w-[28px] items-center rounded-full px-2 py-1"
                style={{
                  backgroundColor: current.count > 0 ? "rgba(5, 150, 105, 0.14)" : "rgba(27, 40, 48, 0.06)",
                }}
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: current.count > 0 ? palette.primary : muted }}
                >
                  {current.count}
                </Text>
              </View>
            </>
          ) : null}
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={muted} />
        </Pressable>

        {open ? (
          <View className="mt-2 overflow-hidden rounded-xl border border-border bg-background">
            {counts.map((item, index) => {
              const optionUi = CATEGORY_UI[item.filter];
              const optionInk = item.filter === "document" ? foreground : optionUi.ink;
              const active = item.filter === selected;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setSelected(item.filter);
                    setOpen(false);
                    onPressCount(item.filter);
                  }}
                  className={`min-h-[52px] flex-row items-center px-3 ${
                    index === counts.length - 1 ? "" : "border-b border-border"
                  } ${active ? "bg-primary/10" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${item.label}, ${item.count}`}
                >
                  <Ionicons name={optionUi.icon} size={18} color={optionInk} />
                  <Text className="ml-3 flex-1 text-[15px] font-medium text-foreground">{item.label}</Text>
                  <Text className="text-[13px] font-bold text-muted">{item.count}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {latest.length > 0 ? (
        <View className="border-t border-border px-4 pt-3 pb-1">
          <Text className="mb-1 text-[15px] font-semibold text-foreground">Latest documents</Text>
          {latest.map((item, index) => (
            <Pressable
              key={`${item.detailKind}:${item.detailId}`}
              onPress={() => onPressRecent(item)}
              className={`min-h-[52px] flex-row items-center py-2.5 ${
                index === latest.length - 1 ? "" : "border-b border-border"
              }`}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: CATEGORY_UI.document.tint }}
              >
                <Ionicons name="document-text" size={18} color={foreground} />
              </View>
              <View className="ml-3 min-w-0 flex-1 pr-2">
                <Text className="text-[15px] font-medium text-foreground" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                  {formatHealthDate(item.at)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={muted} />
            </Pressable>
          ))}
        </View>
      ) : empty ? (
        <Text className="px-4 py-3 text-[14px] leading-5 text-muted">
          Add a condition, allergy, medication, surgery, or upload so this chart can travel with you.
        </Text>
      ) : null}

      <Pressable
        onPress={onShowAll}
        className="min-h-[48px] flex-row items-center justify-between border-t border-border px-4"
        accessibilityRole="button"
        accessibilityLabel="Show all records"
      >
        <Text className="text-[15px] font-semibold text-primary">Show all</Text>
        <Ionicons name="chevron-forward" size={18} color={palette.primary} />
      </Pressable>
    </View>
  );
}
