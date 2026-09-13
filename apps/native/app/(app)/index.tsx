import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { ActionRow } from "@/components/care-placeholders";
import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export default function HomeScreen() {
  const { data: session } = authClient.useSession();
  const me = useQuery({
    ...orpc.patient.me.queryOptions(),
    enabled: Boolean(session?.user),
  });
  const firstName = (me.data?.fullName ?? session?.user.name ?? "there").split(" ")[0];

  return (
    <Container className="px-4">
      <Text className="font-bold text-2xl text-foreground tracking-tight">Hello, {firstName}</Text>
      <Text className="mt-2 text-[15px] leading-6 text-muted">
        Your care timeline starts here. Symptom checks, visits, and clinic routing land on this
        screen next.
      </Text>

      <View className="mt-4 gap-3">
        <ActionRow
          icon="pulse-outline"
          title="Start a symptom check"
          body="Walk through what you’re feeling and get a 5-tier triage result."
        />
        <ActionRow
          icon="calendar-outline"
          title="Upcoming visit"
          body="Confirmed consults and arrival windows will appear here."
        />
      </View>
    </Container>
  );
}
