import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import type { HomeHero, HomeHref, HomePageCard } from "@/lib/home";
import { palette } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const PAGE_ICON: Record<HomePageCard["id"], IconName> = {
  health: "heart",
  clinic: "medkit",
  profile: "person",
};

const CARD_SHADOW = {
  shadowColor: palette.neutral,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

function HeroArt() {
  return (
    <Svg width={108} height={108} viewBox="0 0 108 108">
      <Circle cx="54" cy="54" r="50" fill="rgba(255,255,255,0.12)" />
      <Circle cx="54" cy="54" r="34" fill="rgba(255,255,255,0.16)" />
      <Path
        d="M18 56 H34 L40 42 L48 78 L58 28 L66 62 L72 56 H90"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HomeHeroCard({
  hero,
  onPress,
}: {
  hero: HomeHero;
  onPress: (href: HomeHref) => void;
}) {
  const severe = hero.kind === "severe";
  return (
    <Pressable
      onPress={() => onPress(hero.href)}
      className="overflow-hidden rounded-3xl px-5 py-5"
      style={{
        backgroundColor: severe ? "#0F766E" : palette.primary,
        ...CARD_SHADOW,
        shadowColor: palette.primary,
        shadowOpacity: 0.28,
      }}
      accessibilityRole="button"
      accessibilityLabel={hero.cta}
    >
      <View className="flex-row items-center">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[22px] font-bold leading-7 text-primary-foreground tracking-tight">
            {hero.title}
          </Text>
          <Text className="mt-2 text-[14px] leading-5" style={{ color: "rgba(255,255,255,0.86)" }}>
            {hero.body}
          </Text>
          <View className="mt-4 self-start rounded-full bg-white px-4 py-2">
            <Text className="text-[14px] font-semibold" style={{ color: palette.primary }}>
              {hero.cta}
            </Text>
          </View>
        </View>
        <HeroArt />
      </View>
    </Pressable>
  );
}

export function HomeHealthCard({
  card,
  onPress,
}: {
  card: HomePageCard;
  onPress: (href: HomeHref) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(card.href)}
      className="flex-row items-center rounded-3xl bg-surface px-4 py-4"
      style={CARD_SHADOW}
      accessibilityRole="button"
      accessibilityLabel={card.title}
    >
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
      >
        <Ionicons name="heart" size={24} color={palette.primary} />
      </View>
      <View className="ml-3.5 min-w-0 flex-1">
        <Text className="text-[17px] font-bold text-foreground tracking-tight">{card.title}</Text>
        <Text className="mt-1 text-[13px] leading-5 text-muted">{card.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.primary} />
    </Pressable>
  );
}

export function HomeConnectedPages({
  clinic,
  profile,
  onPress,
}: {
  clinic: HomePageCard;
  profile: HomePageCard;
  onPress: (href: HomeHref) => void;
}) {
  return (
    <View className="flex-row overflow-hidden rounded-3xl bg-surface" style={CARD_SHADOW}>
      <ConnectedTile card={clinic} onPress={onPress} />
      <View className="w-px self-stretch bg-border" />
      <ConnectedTile card={profile} onPress={onPress} />
    </View>
  );
}

function ConnectedTile({
  card,
  onPress,
}: {
  card: HomePageCard;
  onPress: (href: HomeHref) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(card.href)}
      className="min-h-[168px] flex-1 px-4 py-4"
      accessibilityRole="button"
      accessibilityLabel={card.title}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "rgba(5, 150, 105, 0.14)" }}
      >
        <Ionicons name={PAGE_ICON[card.id]} size={24} color={palette.primary} />
      </View>
      <View className="mt-auto pt-8">
        <Text className="text-[17px] font-bold text-foreground tracking-tight">{card.title}</Text>
        <Text className="mt-1 text-[12px] leading-4 text-muted" numberOfLines={2}>
          {card.body}
        </Text>
      </View>
    </Pressable>
  );
}
