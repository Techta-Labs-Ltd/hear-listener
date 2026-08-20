import { SymbolView } from "@/components/ui/AppIcon";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontFamily } from "@/constants/theme";
import { navigationCopy } from "@/utils/copy/navigation";

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(8, insets.bottom);
  const tabHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fontFamily.bodyStrong,
          fontSize: 11,
          fontWeight: "600",
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: navigationCopy.home,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "house.fill" : "house"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: navigationCopy.discover,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "safari.fill" : "safari"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: navigationCopy.library,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "doc.text.fill" : "doc.text"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="library/[section]" options={{ href: null }} />
    </Tabs>
  );
}
