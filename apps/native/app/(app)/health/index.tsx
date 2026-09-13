import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { ScrollView, View } from "react-native";

import { HealthAddFab } from "@/components/health/add-fab";
import { RemedyCards } from "@/components/health/remedy-cards";
import { HealthSummaryCard } from "@/components/health/summary-card";
import { useHealthAdd } from "@/components/health/use-health-add";
import { Container } from "@/components/container";
import { healthItemHref } from "@/lib/document";
import type { RecordType } from "@/lib/health-feed";
import { orpc } from "@/utils/orpc";

const COUNTS: { key: "conditions" | "allergies" | "medications" | "surgeries" | "documents"; label: string; filter: RecordType }[] =
  [
    { key: "conditions", label: "Conditions", filter: "condition" },
    { key: "allergies", label: "Allergies", filter: "allergy" },
    { key: "medications", label: "Medications", filter: "medication" },
    { key: "surgeries", label: "Surgeries", filter: "surgery" },
    { key: "documents", label: "Documents", filter: "document" },
  ];

export default function HealthHubScreen() {
  const router = useRouter();
  const { go } = useHealthAdd();

  const summary = useQuery({
    ...orpc.health.summary.queryOptions(),
    refetchInterval: (query) => {
      const recent = query.state.data?.recent ?? [];
      return recent.some((item) => item.status === "processing") ? 4000 : false;
    },
  });
  const remedy = useQuery(orpc.health.latestRemedy.queryOptions());

  const data = summary.data;

  function openRecords(filter?: RecordType) {
    if (filter) {
      router.push({ pathname: "/(app)/health/records", params: { type: filter } });
      return;
    }
    router.push("/(app)/health/records");
  }

  return (
    <Container isScrollable={false}>
      {summary.isLoading ? (
        <View className="py-12 items-center">
          <Spinner size="sm" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View className="px-4 pt-1">
            <HealthSummaryCard
              counts={COUNTS.map((item) => ({
                key: item.key,
                label: item.label,
                filter: item.filter,
                count: item.key === "documents" ? (data?.documents.length ?? 0) : (data?.[item.key].count ?? 0),
                preview:
                  item.key === "documents"
                    ? data?.documents[0]?.originalFilename ?? null
                    : (data?.[item.key].preview ?? null),
              }))}
              recent={data?.recent ?? []}
              onShowAll={() => openRecords()}
              onPressCount={(filter) => openRecords(filter)}
              onPressRecent={(item) =>
                router.push(healthItemHref(item.detailKind, item.detailId))
              }
            />
            <RemedyCards
              last={remedy.data?.last ?? null}
              onStart={() => router.push("/(app)/health/remedy")}
            />
          </View>
        </ScrollView>
      )}

      <HealthAddFab onSelect={go} />
    </Container>
  );
}
