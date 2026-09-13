import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function ClinicLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "none" }} />;
}
