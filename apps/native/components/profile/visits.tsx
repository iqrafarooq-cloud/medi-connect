import type { ClinicVisit } from "@medi-connect/api/lib/patient-activity";
import { Pressable, Text, View } from "react-native";

import { visitIcon } from "@/components/profile/ui";
import { GroupedList, IconWell, ProfileSection } from "@/components/profile/identity";
import { formatHealthDate } from "@/lib/health";
import { palette } from "@/theme";

function visitMeta(visit: ClinicVisit): string {
  const place = visit.city ? `${visit.city} · ` : "";
  const count = `${visit.visitCount} ${visit.visitCount === 1 ? "visit" : "visits"}`;
  return `${place}${count} · ${formatHealthDate(visit.lastVisitAt)}`;
}

export function ProfileVisits({
  visits,
  onOpenClinics,
}: {
  visits: ClinicVisit[];
  onOpenClinics: () => void;
}) {
  return (
    <ProfileSection title="Clinics visited">
      {visits.length === 0 ? (
        <Pressable
          onPress={onOpenClinics}
          className="rounded-2xl border border-border bg-surface px-4 py-4"
          accessibilityRole="button"
          accessibilityLabel="Find a clinic"
        >
          <Text className="text-[15px] font-semibold text-foreground">No clinics yet</Text>
          <Text className="mt-1 text-[13px] leading-5 text-muted">
            Join a queue from Clinic, or a facility that adds records for you will show up here.
          </Text>
        </Pressable>
      ) : (
        <GroupedList>
          {visits.map((visit, index) => (
            <Pressable
              key={visit.id}
              onPress={onOpenClinics}
              className={`flex-row items-center px-4 py-3 ${
                index === visits.length - 1 ? "" : "border-b border-border"
              }`}
              accessibilityRole="button"
              accessibilityLabel={visit.name}
            >
              <IconWell
                icon={visitIcon(visit.type)}
                tint="rgba(5, 150, 105, 0.12)"
                ink={palette.primary}
              />
              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
                  {visit.name}
                </Text>
                <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
                  {visit.lastReason ? `${visit.lastReason} · ${visitMeta(visit)}` : visitMeta(visit)}
                </Text>
              </View>
            </Pressable>
          ))}
        </GroupedList>
      )}
    </ProfileSection>
  );
}
