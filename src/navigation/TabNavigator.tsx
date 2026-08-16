import { SymbolView } from "@/components/ui/AppIcon";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { colors, fontFamily } from "@/constants/theme";
import { icons } from "@/utils/icons/app-icons";
import { navigationCopy } from "@/utils/copy/navigation";

const tabIcons = {
  index: icons.homeTab,
  explore: icons.discoverTab,
  library: icons.libraryTab,
} as const;
function TabIcon({
  name,
  color,
}: {
  name: keyof typeof tabIcons;
  color: ColorValue;
}) {
  return <SymbolView name={tabIcons[name]} size={22} tintColor={color} />;
}
export function TabNavigator() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fontFamily.bodyStrong, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: navigationCopy.home,
          tabBarIcon: ({ color }) => <TabIcon name="index" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: navigationCopy.discover,
          tabBarIcon: ({ color }) => <TabIcon name="explore" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: navigationCopy.library,
          tabBarIcon: ({ color }) => <TabIcon name="library" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library/[section]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
