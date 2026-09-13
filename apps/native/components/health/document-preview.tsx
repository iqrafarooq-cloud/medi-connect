import { File, Paths } from "expo-file-system";
import { Spinner } from "heroui-native";
import { useEffect, useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { canPreviewDocument, isImageMime, isPdfDocument } from "@/lib/document";
import { pdfViewerHtml } from "@/lib/pdf-html";

function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Spinner size="sm" />
    </View>
  );
}

function Message({ text }: { text: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8 bg-background">
      <Text className="text-center text-[15px] leading-6 text-muted">{text}</Text>
    </View>
  );
}

function AndroidPdfPreview({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const dest = new File(Paths.cache, "health-preview.pdf");

    void (async () => {
      try {
        const file = await File.downloadFileAsync(url, dest, {
          idempotent: true,
          signal: controller.signal,
        });
        const base64 = await file.base64();
        if (controller.signal.aborted) return;
        setHtml(pdfViewerHtml(base64));
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();

    return () => controller.abort();
  }, [url]);

  if (failed) return <Message text="Could not open this PDF." />;
  if (!html) return <Loading />;

  return (
    <WebView
      source={{ html }}
      style={{ flex: 1, backgroundColor: "#f3f6f8" }}
      originWhitelist={["*"]}
      javaScriptEnabled
      nestedScrollEnabled
      setSupportMultipleWindows={false}
      startInLoadingState
      renderLoading={() => <Loading />}
    />
  );
}

export function DocumentPreview({
  signedUrl,
  mimeType,
  fileName,
}: {
  signedUrl: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}) {
  if (!signedUrl) {
    return <Message text="This file isn't available to preview." />;
  }

  if (!canPreviewDocument(mimeType, fileName)) {
    return <Message text="This file type can't be previewed on the phone." />;
  }

  if (isImageMime(mimeType) && Platform.OS === "android") {
    return (
      <Image
        source={{ uri: signedUrl }}
        className="flex-1 w-full bg-background"
        resizeMode="contain"
        accessibilityLabel={fileName ?? "Document image"}
      />
    );
  }

  if (Platform.OS === "android" && isPdfDocument(mimeType, fileName)) {
    return <AndroidPdfPreview url={signedUrl} />;
  }

  return (
    <WebView
      source={{ uri: signedUrl }}
      style={{ flex: 1, backgroundColor: "#f3f6f8" }}
      originWhitelist={["*"]}
      javaScriptEnabled
      nestedScrollEnabled
      setSupportMultipleWindows={false}
      startInLoadingState
      renderLoading={() => <Loading />}
    />
  );
}
