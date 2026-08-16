import type { ReactNode } from "react";
import type {
  ColorValue,
  ImageStyle,
  StyleProp,
  TextInputProps,
  TextProps,
  ViewProps,
  ViewStyle,
} from "react-native";
import type { ContentItem, Topic } from "./content";

export type HearLogoProps = {
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
};

export type AnimatedLaunchScreenProps = {
  onComplete: () => void;
};

export type SymbolName = string | { ios: string; android: string; web: string };

export type AppIconProps = {
  name: SymbolName;
  size?: number;
  tintColor?: ColorValue;
};

export type AppScreenProps = ViewProps & {
  className?: string;
};

export type AppTextTone =
  "default" | "muted" | "primary" | "inverse" | "danger" | "success";

export type AppTextVariant =
  "overline" | "body" | "heading" | "title" | "label";

export type AppTextProps = TextProps & {
  className?: string;
  tone?: AppTextTone;
  variant?: AppTextVariant;
};

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  size?: "compact" | "regular";
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  className?: string;
};

export type IconButtonProps = {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  className?: string;
  tintColor?: string;
};

export type InputProps = TextInputProps & {
  className?: string;
  label: string;
  error?: string;
  hint?: string;
};

export type EmptyStateProps = {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type ScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  backLabel?: string;
  action?: ReactNode;
};

export type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  onAction?: () => void;
};

export type ListSectionProps = {
  label?: string;
  children: ReactNode;
};

export type ListRowProps = {
  title: string;
  detail?: string;
  icon?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
};

export type ToggleRowProps = {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export type StoryCardProps = {
  item: ContentItem;
  compact?: boolean;
};

export type TopicGridProps = {
  topics: Topic[];
  activeId?: string;
  onSelect: (topicId: string) => void;
};

export type ProgressTrackProps = {
  progress: number;
  height?: number;
  style?: ViewStyle;
  className?: string;
};

export type LibraryMenuCardProps = {
  title: string;
  detail: string;
  onPress: () => void;
};
