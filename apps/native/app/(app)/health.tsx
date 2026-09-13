import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyPanel } from "@/components/care-placeholders";
import { Container } from "@/components/container";

export default function HealthScreen() {
  const insets = useSafeAreaInsets();

  return (
    <Container isScrollable={false} className="px-6">
      <View style={{ paddingTop: insets.top + 12 }}>
        <Text className="font-bold text-3xl text-foreground tracking-tight">Records</Text>
      </View>
      <EmptyPanel
        icon="heart-outline"
        title="No vitals or labs yet"
        body="When labs, prescriptions, and home readings are linked to your CNIC, they will live on this tab — never invented, never unlabeled."
      />
    </Container>
  );
}
