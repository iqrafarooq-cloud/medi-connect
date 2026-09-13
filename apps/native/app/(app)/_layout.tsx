import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";

import { TabAppHeader } from "@/components/app-header";
import { palette } from "@/theme";

export default function AppTabsLayout() {
  const muted = useThemeColor("muted");
  const background = useThemeColor("background");

  return (
    <View className="flex-1 bg-background">
      <TabAppHeader />
      <View className="flex-1">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: palette.primary,
            tabBarInactiveTintColor: muted,
            tabBarStyle: {
              backgroundColor: background,
              borderTopColor: "transparent",
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="health"
            options={{
              title: "Health",
              tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="clinic"
            options={{
              title: "Clinic",
              tabBarIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}
