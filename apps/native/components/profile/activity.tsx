import type { ActivityEvent } from "@medi-connect/api/lib/patient-activity";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { ACTIVITY_UI } from "@/components/profile/ui";
import { GroupedList, IconWell, ProfileSection } from "@/components/profile/identity";
import { formatActivityWhen } from "@/lib/profile";

export function ProfileActivity({
  events,
  onPressEvent,
}: {
  events: ActivityEvent[];
  onPressEvent: (event: ActivityEvent) => void;
}) {
  const muted = useThemeColor("muted");

  return (
    <ProfileSection title="Activity">
      {events.length === 0 ? (
        <View className="rounded-2xl border border-border bg-surface px-4 py-4">
          <Text className="text-[15px] font-semibold text-foreground">Nothing recorded yet</Text>
          <Text className="mt-1 text-[13px] leading-5 text-muted">
            Symptom checks, records you add, and clinic visits will land here.
          </Text>
        </View>
      ) : (
        <GroupedList>
          {events.map((event, index) => {
            const ui = ACTIVITY_UI[event.kind];
            const tappable = Boolean(event.detailKind || event.kind === "visit" || event.kind === "remedy");
            const meta = [event.detail, formatActivityWhen(event.at)].filter(Boolean).join(" · ");
            return (
              <Pressable
                key={event.id}
                onPress={() => {
                  if (tappable) onPressEvent(event);
                }}
                disabled={!tappable}
                className={`flex-row items-center px-4 py-3 ${
                  index === events.length - 1 ? "" : "border-b border-border"
                }`}
                accessibilityRole={tappable ? "button" : "text"}
                accessibilityLabel={event.title}
              >
                <IconWell icon={ui.icon} tint={ui.tint} ink={ui.ink} />
                <View className="ml-3 min-w-0 flex-1 pr-2">
                  <Text className="text-[15px] font-medium text-foreground" numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={2}>
                    {meta}
                  </Text>
                </View>
                {tappable ? <Ionicons name="chevron-forward" size={16} color={muted} /> : null}
              </Pressable>
            );
          })}
        </GroupedList>
      )}
    </ProfileSection>
  );
}
