import { formatCnic, formatPakistanPhone } from "@/lib/pakistan";
import { useQuery } from "@tanstack/react-query";
import { Button, Spinner } from "heroui-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { queryClient, orpc } from "@/utils/orpc";

const genderLabel: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

function formatDob(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const iso = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Detail({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View className={`py-3 ${isLast ? "" : "border-b border-border"}`}>
      <Text className="text-xs font-medium text-muted">{label}</Text>
      <Text className="mt-0.5 text-[15px] text-foreground">{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const me = useQuery({
    ...orpc.patient.me.queryOptions(),
    enabled: Boolean(session?.user),
  });

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  return (
    <Container className="px-6">
      <View style={{ paddingTop: insets.top + 12 }} className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="font-bold text-3xl text-foreground tracking-tight">Your details</Text>
        </View>
        <ThemeToggle />
      </View>

      {me.isLoading ? (
        <View className="py-12 items-center">
          <Spinner size="sm" />
        </View>
      ) : me.data ? (
        <View className="mt-6 rounded-2xl border border-border bg-surface px-4">
          <Detail label="Name" value={me.data.fullName} />
          <Detail label="Email" value={me.data.email} />
          <Detail label="Mobile" value={me.data.phone ? formatPakistanPhone(me.data.phone) : "—"} />
          <Detail label="CNIC" value={formatCnic(me.data.cnic)} />
          <Detail label="Date of birth" value={formatDob(me.data.dateOfBirth)} />
          <Detail label="Gender" value={genderLabel[me.data.gender] ?? me.data.gender} isLast />
        </View>
      ) : (
        <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-foreground font-medium">{session?.user.name}</Text>
          <Text className="text-muted text-sm mt-1">{session?.user.email}</Text>
          <Text className="text-muted text-sm mt-3">
            Your health profile could not be loaded. You can still sign out and try again.
          </Text>
        </View>
      )}

      <Button variant="danger-soft" onPress={() => void signOut()} className="mt-8">
        <Button.Label>Sign out</Button.Label>
      </Button>
    </Container>
  );
}
