import { Link as RouterLink } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native-css/components";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import { useCssElement, useNativeVariable } from "react-native-css";

export { Pressable, ScrollView, Text, TextInput, View };

export type ViewProps = React.ComponentProps<typeof View>;
export type TextProps = React.ComponentProps<typeof Text>;
export type PressableProps = React.ComponentProps<typeof Pressable>;
export type ScrollViewProps = React.ComponentProps<typeof ScrollView>;
export type TextInputProps = React.ComponentProps<typeof TextInput>;

export type SafeAreaViewProps = React.ComponentProps<
  typeof NativeSafeAreaView
> & { className?: string };
export const SafeAreaView = (props: SafeAreaViewProps) =>
  useCssElement(NativeSafeAreaView, props, { className: "style" });
SafeAreaView.displayName = "CSS(SafeAreaView)";

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string },
) => useCssElement(RouterLink as React.ComponentType<any>, props, { className: "style" });
Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

export const useCSSVariable =
  process.env.EXPO_OS === "web"
    ? (variable: string) => `var(${variable})`
    : useNativeVariable;

