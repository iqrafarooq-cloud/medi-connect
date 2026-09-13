import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { CATEGORY_UI } from "@/components/health/category-ui";
import { HealthAddSheet } from "@/components/health/add-sheet";
import { Chip, ChipScroller } from "@/components/health/chips";
import { RecordRow } from "@/components/health/rows";
import { HeaderIconButton, ScreenHeader } from "@/components/health/screen-header";
import { useHealthAdd } from "@/components/health/use-health-add";
import { Container } from "@/components/container";
import { healthItemHref } from "@/lib/document";
import { formatHealthDate } from "@/lib/health";
import {
  buildHealthFeed,
  filterHealthFeed,
  parseRecordFilter,
  RECORD_FILTER_OPTIONS,
  RECORD_TYPE_LABEL,
  type RecordFilter,
} from "@/lib/health-feed";
import { palette } from "@/theme";
import { orpc } from "@/utils/orpc";

export default function HealthRecordsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const { sheetOpen, openSheet, closeSheet, go } = useHealthAdd();
  const [filter, setFilter] = useState<RecordFilter>(() => parseRecordFilter(params.type));

  const summary = useQuery({
    ...orpc.health.summary.queryOptions(),
    refetchInterval: (query) => {
      const recent = query.state.data?.recent ?? [];
      return recent.some((item) => item.status === "processing") ? 4000 : false;
    },
  });

  useEffect(() => {
    setFilter(parseRecordFilter(params.type));
  }, [params.type]);

  const feed = useMemo(() => {
    if (!summary.data) return [];
    return buildHealthFeed({
      diagnoses: summary.data.diagnoses,
      allergies: summary.data.allergyItems,
      medications: summary.data.medicationItems,
      procedures: summary.data.procedureItems,
      documents: summary.data.documents,
    });
  }, [summary.data]);

  const rows = filterHealthFeed(feed, filter);
  const emptyLabel =
    RECORD_FILTER_OPTIONS.find((option) => option.value === filter)?.label.toLowerCase() ?? "records";

  return (
    <Container isScrollable={false}>
      <ScreenHeader
        large
        title="Records"
        subtitle="Your full chart — filter by type"
        onBack={() => router.back()}
        right={<HeaderIconButton icon="add" label="Add record" emphasis onPress={openSheet} />}
      />

      <View className="pb-3">
        <ChipScroller>
          {RECORD_FILTER_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              active={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </ChipScroller>
      </View>

      {summary.isLoading ? (
        <View className="py-12 items-center">
          <Spinner size="sm" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {rows.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <View
                className="h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
              >
                <Ionicons
                  name={filter === "all" ? "file-tray-outline" : CATEGORY_UI[filter].icon}
                  size={28}
                  color={palette.primary}
                />
              </View>
              <Text className="mt-4 text-center font-bold text-xl text-foreground tracking-tight">
                {filter === "all" ? "No records yet" : `No ${emptyLabel}`}
              </Text>
              <Text className="mt-2 text-center text-[15px] leading-6 text-muted">
                {filter === "all"
                  ? "Add a condition, allergy, medication, surgery, or upload and it will land here."
                  : `Nothing in ${emptyLabel} yet. Add one from the plus button.`}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {rows.map((item) => {
                const status =
                  item.status === "processing" ? "Processing" : item.status === "failed" ? "Failed" : null;
                const meta = [RECORD_TYPE_LABEL[item.type], formatHealthDate(item.at), item.extra]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <RecordRow
                    key={item.id}
                    type={item.type}
                    title={item.title}
                    meta={meta}
                    status={status}
                    danger={item.danger}
                    onPress={() => router.push(healthItemHref(item.detailKind, item.detailId))}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <HealthAddSheet open={sheetOpen} onClose={closeSheet} onSelect={go} />
    </Container>
  );
}
