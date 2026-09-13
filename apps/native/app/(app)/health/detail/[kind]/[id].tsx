import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { Image, Text, View } from "react-native";

import { ScreenHeader } from "@/components/health/screen-header";
import { Container } from "@/components/container";
import { PrimaryButton } from "@/components/primary-button";
import { healthItemHref, isImageMime } from "@/lib/document";
import { formatHealthDate } from "@/lib/health";
import { orpc } from "@/utils/orpc";

export default function RecordDetailScreen() {
  const router = useRouter();
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const isDocument = kind === "document";
  const detail = useQuery({
    ...orpc.health.getDetail.queryOptions({
      input: {
        kind: (kind as "condition" | "allergy" | "medication" | "surgery" | "document") ?? "document",
        id: id ?? "",
      },
    }),
    enabled: Boolean(kind && id),
  });

  const record = detail.data;
  const showPreview = Boolean(isDocument && isImageMime(record?.mimeType) && record?.signedUrl);

  return (
    <Container>
      <ScreenHeader title="Record" onBack={() => router.back()} />
      {detail.isLoading ? (
        <View className="py-12 items-center">
          <Spinner size="sm" />
        </View>
      ) : !record ? (
        <Text className="mt-6 text-center text-[15px] text-muted">Record not found</Text>
      ) : (
        <View className="mx-4 rounded-2xl border border-border bg-surface px-4 py-3">
          <Text className="text-xl font-semibold text-foreground">{record.title}</Text>
          <Text className="mt-1 text-[15px] text-muted">{formatHealthDate(record.date)}</Text>
          <Text className="mt-3 text-xs font-medium text-muted">
            {String(record.recordType)} · {record.sourceLabel}
          </Text>
          {record.notes ? <Text className="mt-3 text-[15px] text-foreground">{record.notes}</Text> : null}
          {record.relatedTitle ? (
            <Text className="mt-3 text-[15px] text-muted">{record.relatedTitle}</Text>
          ) : null}

          {showPreview ? (
            <Image
              source={{ uri: record.signedUrl ?? undefined }}
              className="mt-4 h-56 w-full rounded-xl bg-surface-secondary"
              resizeMode="cover"
            />
          ) : null}

          {isDocument && record.fileName ? (
            <Text className="mt-4 text-[13px] text-muted">{record.fileName}</Text>
          ) : null}

          {isDocument && record.signedUrl && id ? (
            <PrimaryButton
              size="lg"
              className="mt-4"
              onPress={() => {
                router.push(healthItemHref("document", id));
              }}
            >
              <PrimaryButton.Label>View</PrimaryButton.Label>
            </PrimaryButton>
          ) : null}

          {record.ingestionStatus && record.ingestionStatus !== "ready" ? (
            <Text className="mt-3 text-xs font-medium text-muted">
              {record.ingestionStatus === "failed" ? "Failed" : "Processing"}
            </Text>
          ) : null}
        </View>
      )}
    </Container>
  );
}
