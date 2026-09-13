/**
 * Humane Clinical Mobile System
 * Source: mobile design sheet (primary / secondary / tertiary / neutral).
 */
export const palette = {
  primary: "#059669",
  secondary: "#00A896",
  tertiary: "#E63946",
  neutral: "#1B2830",
  ice: "#F3F6F8",
  iceMuted: "#E8EEF2",
  iceBorder: "#D5DEE4",
  white: "#FFFFFF",
} as const;

export const oklch = {
  primary: "oklch(0.5960 0.1274 163.23)",
  secondary: "oklch(0.6563 0.1178 181.68)",
  tertiary: "oklch(0.6122 0.2082 22.24)",
  neutral: "oklch(0.2686 0.0233 235.80)",
  ice: "oklch(0.9714 0.0042 236.50)",
  iceMuted: "oklch(0.9457 0.0084 236.56)",
  iceBorder: "oklch(0.8955 0.0128 236.64)",
} as const;

export const fonts = {
  headline: "PlusJakartaSans_600SemiBold",
  headlineBold: "PlusJakartaSans_700Bold",
  body: "Inter_400Regular",
  label: "Inter_500Medium",
} as const;

export const semantic = {
  light: {
    background: palette.ice,
    foreground: palette.neutral,
    statusBar: "dark" as const,
  },
  dark: {
    background: "#121C22",
    foreground: palette.ice,
    statusBar: "light" as const,
  },
} as const;

export type PaletteName = keyof typeof palette;
