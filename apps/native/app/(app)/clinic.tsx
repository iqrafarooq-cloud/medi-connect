import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyPanel } from "@/components/care-placeholders";
import { Container } from "@/components/container";

export default function ClinicScreen() {
  const insets = useSafeAreaInsets();

  return (
    <Container isScrollable={false} className="px-6">
      <View style={{ paddingTop: insets.top + 12 }}>
        <Text className="font-bold text-3xl text-foreground tracking-tight">Your clinic</Text>
      </View>
      <EmptyPanel
        icon="medkit-outline"
        title="No clinic selected"
        body="You’ll choose a facility for pre-arrival routing and consults here. Until then, nothing is assigned."
      />
    </Container>
  );
}
