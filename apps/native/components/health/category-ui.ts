import type { ComponentProps } from "react";

import type { RecordType } from "@/lib/health-feed";
import { palette } from "@/theme";

type IconName = ComponentProps<typeof import("@expo/vector-icons").Ionicons>["name"];

export const CATEGORY_UI: Record<RecordType, { icon: IconName; tint: string; ink: string; hint: string }> = {
  condition: {
    icon: "pulse",
    tint: "rgba(5, 150, 105, 0.12)",
    ink: palette.primary,
    hint: "Diagnoses on file",
  },
  allergy: {
    icon: "alert-circle",
    tint: "rgba(230, 57, 70, 0.12)",
    ink: palette.tertiary,
    hint: "Reactions to watch",
  },
  medication: {
    icon: "medkit",
    tint: "rgba(0, 168, 150, 0.14)",
    ink: palette.secondary,
    hint: "Prescriptions and doses",
  },
  surgery: {
    icon: "cut",
    tint: "rgba(14, 98, 81, 0.12)",
    ink: "#0E6251",
    hint: "Procedures and operations",
  },
  document: {
    icon: "document-text",
    tint: "rgba(27, 40, 48, 0.08)",
    ink: palette.neutral,
    hint: "Labs, imaging, reports",
  },
};
