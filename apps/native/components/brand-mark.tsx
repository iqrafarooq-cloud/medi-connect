import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { palette } from "@/theme";

export function BrandMark({ size = 72 }: { size?: number }) {
  const iconSize = Math.round(size * 0.5);

  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        backgroundColor: palette.secondary,
        shadowColor: palette.primary,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <Ionicons name="pulse" size={iconSize} color={palette.white} />
    </View>
  );
}
