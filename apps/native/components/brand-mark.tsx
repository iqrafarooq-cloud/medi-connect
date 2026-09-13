import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { palette } from "@/theme";

export function BrandMark({ size = 72 }: { size?: number }) {
  const radius = Math.round(size * 0.28);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        shadowColor: palette.primary,
        shadowOpacity: 0.22,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id="brandMarkFill" x1="8" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#1CC8A8" />
            <Stop offset="1" stopColor="#0E8F6B" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="48" height="48" rx="13.5" fill="url(#brandMarkFill)" />
        <Circle
          cx="24"
          cy="24"
          r="16.5"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeDasharray="0.2 2.7"
        />
        <Path
          d="M8 25.5 H15.2 L17.6 21.2 L20.8 32.2 L24.6 12.8 L28.2 27.2 L30.6 25.5 H40"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
