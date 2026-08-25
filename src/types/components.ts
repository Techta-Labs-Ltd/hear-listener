import type { ReactNode } from "react";
import type {
  AccessibilityProps,
  ColorValue,
  ImageStyle,
  StyleProp,
  TextInputProps,
  TextProps,
  ViewProps,
  ViewStyle,
} from "react-native";
import type { ContentItem, Entity, Topic } from "./content";

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
  screenTitle?: string;
  screenOrientation?: string;
  screenReadout?: string | (() => string);
  voiceCommands?: string[];
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

export type ContinueListeningCardProps = {
  item: ContentItem;
  className?: string;
};

export type StoryTileProps = {
  item: ContentItem;
  className?: string;
};

export type PlayerArtworkProps = {
  item: ContentItem;
  size?: "player" | "finished";
  className?: string;
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

export type VoiceReadyBannerProps = {
  className?: string;
};

export type QuickStartCardProps = {
  step: number;
  title: string;
  description: string;
  tone?: "dark" | "peach";
  className?: string;
};

export type PromoCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: string;
  playLabel?: string;
  tone?: "brand" | "editor";
  compact?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
  accessibilityValue?: AccessibilityProps["accessibilityValue"];
  className?: string;
};

export type TopicChipProps = {
  topic: Topic;
  count: number;
  accent: string;
  onPress: () => void;
};

export type StoryRowProps = {
  item: ContentItem;
  subtitle?: string;
  thumbSize?: "md" | "sm" | "none";
  showPlay?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  className?: string;
};

export type SearchBarProps = {
  label: string;
  onPress: () => void;
  className?: string;
};

export type OfflineNoticeProps = {
  onOpenDownloads: () => void;
  className?: string;
};

export type SkeletonBlockProps = {
  tone?: "default" | "soft" | "dark";
  className?: string;
};

export type ShimmerProps = {
  className?: string;
  children?: ReactNode;
};

export type ShimmerBlockProps = {
  className?: string;
  tone?: "default" | "soft" | "dark";
};

export type OptionRowProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export type OnlineDiscoverContentProps = {
  editorPick?: ContentItem;
  tonight?: ContentItem;
};

export type ShowResultProps = {
  entity: Entity;
  onPlay: () => void;
};

export type PlayingPlayerProps = {
  current: ContentItem;
};

export type FinishedPlayerProps = {
  current: ContentItem;
};

export type PlayingCardProps = {
  item: ContentItem;
};

export type QueueRowProps = {
  item: ContentItem;
};

export type VoiceTipProps = {
  eyebrow: string;
  text: string;
  tone?: "default" | "mint";
  className?: string;
};

export type LibraryHubRowProps = {
  title: string;
  detail: string;
  icon: string;
  iconTint: string;
  iconBackground: string;
  onPress: () => void;
};

export type LibraryHubTileProps = {
  title: string;
  detail: string;
  icon: string;
  accent: string;
  onPress: () => void;
  className?: string;
};

export type SectionPageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
  small?: boolean;
  backLabel: string;
  onBack: () => void;
};

export type SyncPausedCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
};

export type SoundWaveSize = "sm" | "md" | "lg";

export type SoundWaveBarsProps = {
  playing?: boolean;
  barCount?: number;
  size?: SoundWaveSize;
  colors?: readonly string[] | string[];
  className?: string;
};
