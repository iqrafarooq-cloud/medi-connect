import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "onboarding_complete";

export async function getOnboardingComplete(): Promise<boolean> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(KEY) === "1";
    } catch {
      return false;
    }
  }
  const value = await SecureStore.getItemAsync(KEY);
  return value === "1";
}

export async function setOnboardingComplete(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(KEY, "1");
    } catch {
      // ignore quota / private mode
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, "1");
}
