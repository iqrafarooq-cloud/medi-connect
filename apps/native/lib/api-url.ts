import { env } from "@medi-connect/env/native";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { resolveNativeServerUrl } from "@/lib/server-url";

export const nativeServerUrl = resolveNativeServerUrl({
  envUrl: env.EXPO_PUBLIC_SERVER_URL,
  hostUri: Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? null,
  platform: Platform.OS,
});
