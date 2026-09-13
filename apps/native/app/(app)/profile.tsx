import { Ionicons } from "@expo/vector-icons";
import type { ActivityEvent } from "@medi-connect/api/lib/patient-activity";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { ProfileActivity } from "@/components/profile/activity";
import { ProfileDetailRow } from "@/components/profile/details";
import { GroupedList, ProfileIdentity, ProfileSection } from "@/components/profile/identity";
import { ProfileVisits } from "@/components/profile/visits";
import { authClient } from "@/lib/auth-client";
import { healthItemHref } from "@/lib/document";
import { formatCnic, formatPakistanPhone } from "@/lib/pakistan";
import { palette } from "@/theme";
import { orpc, queryClient } from "@/utils/orpc";

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

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const me = useQuery({
    ...orpc.patient.me.queryOptions(),
    enabled: Boolean(session?.user),
  });
  const activity = useQuery({
    ...orpc.health.activity.queryOptions(),
    enabled: Boolean(session?.user),
  });

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  function openEvent(event: ActivityEvent) {
    if (event.detailKind && event.detailId) {
      router.push(healthItemHref(event.detailKind, event.detailId));
      return;
    }
    if (event.kind === "visit") {
      router.push("/(app)/clinic");
      return;
    }
    if (event.kind === "remedy") {
      router.push("/(app)/health/remedy");
    }
  }

  const name = me.data?.fullName ?? session?.user.name ?? "Your profile";
  const email = me.data?.email ?? session?.user.email ?? "";

  return (
    <Container className="px-4 pt-1">
      {me.isLoading ? (
        <View className="py-12 items-center">
          <Spinner size="sm" />
        </View>
      ) : (
        <>
          <ProfileIdentity name={name} email={email} stats={activity.data?.stats ?? null} />

          {me.data ? (
            <ProfileSection title="Your details">
              <GroupedList>
                <ProfileDetailRow
                  icon="call-outline"
                  label="Mobile"
                  value={me.data.phone ? formatPakistanPhone(me.data.phone) : "—"}
                />
                <ProfileDetailRow icon="card-outline" label="CNIC" value={formatCnic(me.data.cnic)} />
                <ProfileDetailRow icon="calendar-outline" label="Date of birth" value={formatDob(me.data.dateOfBirth)} />
                <ProfileDetailRow
                  icon="male-female-outline"
                  label="Gender"
                  value={genderLabel[me.data.gender] ?? me.data.gender}
                  last
                />
              </GroupedList>
            </ProfileSection>
          ) : (
            <View className="mt-7 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-[15px] font-semibold text-foreground">Couldn’t load your details</Text>
              <Text className="mt-1 text-[13px] leading-5 text-muted">
                Sign out and try again if this keeps happening.
              </Text>
            </View>
          )}

          {activity.isLoading ? (
            <View className="py-10 items-center">
              <Spinner size="sm" />
            </View>
          ) : activity.data ? (
            <>
              <ProfileVisits visits={activity.data.visits} onOpenClinics={() => router.push("/(app)/clinic")} />
              <ProfileActivity events={activity.data.events} onPressEvent={openEvent} />
            </>
          ) : (
            <View className="mt-7 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-[15px] font-semibold text-foreground">History unavailable</Text>
              <Text className="mt-1 text-[13px] leading-5 text-muted">
                Your clinic visits and activity could not be loaded right now.
              </Text>
            </View>
          )}
        </>
      )}

      <Pressable
        onPress={() => void signOut()}
        className="mt-8 mb-4 h-12 flex-row items-center justify-center gap-2 rounded-xl"
        style={{ backgroundColor: "rgba(230, 57, 70, 0.12)" }}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={18} color={palette.tertiary} />
        <Text className="text-[15px] font-semibold" style={{ color: palette.tertiary }}>
          Sign out
        </Text>
      </Pressable>
    </Container>
  );
}
