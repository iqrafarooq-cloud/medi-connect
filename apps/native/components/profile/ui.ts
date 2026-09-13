import type { ActivityKind } from "@medi-connect/api/lib/patient-activity";
import type { ComponentProps } from "react";

import { palette } from "@/theme";

export type IconName = ComponentProps<typeof import("@expo/vector-icons").Ionicons>["name"];

export const ACTIVITY_UI: Record<ActivityKind, { icon: IconName; tint: string; ink: string }> = {
  joined: {
    icon: "person-add-outline",
    tint: "rgba(5, 150, 105, 0.12)",
    ink: palette.primary,
  },
  condition: {
    icon: "pulse",
    tint: "rgba(5, 150, 105, 0.12)",
    ink: palette.primary,
  },
  allergy: {
    icon: "alert-circle",
    tint: "rgba(230, 57, 70, 0.12)",
    ink: palette.tertiary,
  },
  medication: {
    icon: "medkit",
    tint: "rgba(0, 168, 150, 0.14)",
    ink: palette.secondary,
  },
  surgery: {
    icon: "cut",
    tint: "rgba(14, 98, 81, 0.12)",
    ink: "#0E6251",
  },
  document: {
    icon: "document-text",
    tint: "rgba(27, 40, 48, 0.08)",
    ink: palette.neutral,
  },
  remedy: {
    icon: "leaf-outline",
    tint: "rgba(0, 168, 150, 0.14)",
    ink: palette.secondary,
  },
  visit: {
    icon: "navigate-outline",
    tint: "rgba(5, 150, 105, 0.12)",
    ink: palette.primary,
  },
  encounter: {
    icon: "clipboard-outline",
    tint: "rgba(14, 98, 81, 0.12)",
    ink: "#0E6251",
  },
};

export function visitIcon(type: string): IconName {
  if (type === "hospital") return "business-outline";
  if (type === "facility") return "location-outline";
  return "medkit-outline";
}
