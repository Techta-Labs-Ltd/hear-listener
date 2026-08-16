import { Link as RouterLink } from "expo-router";
import { useCssElement, useNativeVariable } from "react-native-css";
import { forwardRef } from "react";
import {
  Pressable as NativePressable,
  ScrollView as NativeScrollView,
  Text as NativeText,
  TextInput as NativeTextInput,
  View as NativeView,
} from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

type ClassNameProp = { className?: string };

export type ViewProps = React.ComponentProps<typeof NativeView> & ClassNameProp;
export const View = (props: ViewProps) =>
  useCssElement(NativeView, props, { className: "style" });
View.displayName = "CSS(View)";

export type TextProps = React.ComponentProps<typeof NativeText> & ClassNameProp;
export const Text = (props: TextProps) =>
  useCssElement(NativeText, props, { className: "style" });
Text.displayName = "CSS(Text)";

export type PressableProps = React.ComponentProps<typeof NativePressable> &
  ClassNameProp;
export const Pressable = (props: PressableProps) =>
  useCssElement(NativePressable, props, { className: "style" });
Pressable.displayName = "CSS(Pressable)";

export type ScrollViewProps = React.ComponentProps<typeof NativeScrollView> &
  ClassNameProp & { contentContainerClassName?: string };
export const ScrollView = forwardRef<NativeScrollView, ScrollViewProps>(
  function ScrollView(props, ref) {
    // @ts-expect-error React Native's generic ref union exceeds TS 6 complexity.
    return useCssElement(NativeScrollView, { ...props, ref }, {
      className: "style",
      contentContainerClassName: "contentContainerStyle",
    });
  },
);
ScrollView.displayName = "CSS(ScrollView)";

export type TextInputProps = React.ComponentProps<typeof NativeTextInput> &
  ClassNameProp;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  function TextInput(props, ref) {
    return useCssElement(NativeTextInput, { ...props, ref }, {
      className: "style",
    });
  },
);
TextInput.displayName = "CSS(TextInput)";

export type SafeAreaViewProps = React.ComponentProps<
  typeof NativeSafeAreaView
> &
  ClassNameProp;
export const SafeAreaView = (props: SafeAreaViewProps) =>
  useCssElement(NativeSafeAreaView, props, { className: "style" });
SafeAreaView.displayName = "CSS(SafeAreaView)";

export const Link = (
  props: React.ComponentProps<typeof RouterLink> & ClassNameProp,
) => useCssElement(RouterLink, props, { className: "style" });
Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

export const useCSSVariable =
  process.env.EXPO_OS === "web"
    ? (variable: string) => `var(${variable})`
    : useNativeVariable;
