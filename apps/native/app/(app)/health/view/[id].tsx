import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { Text, View } from "react-native";

import { DocumentPreview } from "@/components/health/document-preview";
import { ScreenHeader } from "@/components/health/screen-header";
import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function DocumentViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery({
    ...orpc.health.getDetail.queryOptions({
      input: { kind: "document", id: id ?? "" },
    }),
    enabled: Boolean(id),
  });

  const record = detail.data;

  return (
    <Container isScrollable={false}>
      <ScreenHeader title={record?.title ?? "Document"} onBack={() => router.back()} />
      {detail.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Spinner size="sm" />
        </View>
      ) : !record ? (
        <Text className="mt-6 text-center text-[15px] text-muted">Document not found</Text>
      ) : (
        <View className="flex-1">
          <DocumentPreview
            signedUrl={record.signedUrl}
            mimeType={record.mimeType}
            fileName={record.fileName}
          />
        </View>
      )}
    </Container>
  );
}
