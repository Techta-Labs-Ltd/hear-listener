import { Alert } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { SymbolView } from "@/components/ui/AppIcon";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Pressable, ScrollView, View } from "@/tw";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { icons } from "@/utils/icons/app-icons";

export function AccountSettingsView({ onBack }: { onBack: () => void }) {
  const account = useAccountAccess();
  const name = account.profile?.displayName || "David";
  const email = account.profile?.email || "david@example.com";
  const initial = name.charAt(0).toUpperCase() || "D";
  const provider = account.profile?.provider === "apple" ? "Apple" : "Google";

  const handleSignOut = () => {
    Alert.alert("Sign out?", "Your saved listening stays on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => void account.signOut(),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-canvas">
      <View className="w-full max-w-[720px] flex-1 self-center">
        <ScreenHeader title="Account" onBack={onBack} />
        <ScrollView
          contentContainerClassName="px-5 pt-6 pb-12 items-center"
          showsVerticalScrollIndicator={false}
        >
          <View className="h-28 w-28 items-center justify-center rounded-full bg-primary-soft">
            <AppText className="font-display text-[44px] leading-[52px] text-primary">
              {initial}
            </AppText>
          </View>

          <AppText
            accessibilityRole="header"
            className="mt-5 font-display text-[28px] leading-[34px] text-ink"
          >
            {name}
          </AppText>
          <AppText tone="muted" className="mt-1 text-sm leading-[18px]">
            {email}
          </AppText>

          <View className="mt-8 w-full gap-3.5">
            <View className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5">
              <View className="gap-1">
                <AppText className="font-body-bold text-base leading-5 text-ink">
                  Sync status
                </AppText>
                <AppText className="font-body-medium text-xs leading-4 text-[#0F6973]">
                  Up to date
                </AppText>
              </View>
              <SymbolView name={icons.success} size={18} tintColor="#0F6973" />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Manage ${provider} account`}
              className="flex-row items-center justify-between rounded-[20px] border border-border bg-surface p-5 active:opacity-80"
            >
              <AppText className="font-body-bold text-base leading-5 text-ink">
                Manage {provider} account
              </AppText>
              <AppText className="text-xl text-muted">›</AppText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityHint="Signs out of your account while keeping local audio."
            onPress={handleSignOut}
            className="mt-9 h-14 w-full items-center justify-center rounded-[20px] bg-[#FFF0EE] active:opacity-75"
          >
            <AppText className="font-body-bold text-base leading-5 text-[#A64E55]">
              Sign out
            </AppText>
          </Pressable>

          <AppText tone="muted" className="mt-6 text-center text-xs leading-4">
            Voice requires confirmation: “Yes, sign out.”
          </AppText>
        </ScrollView>
      </View>
    </View>
  );
}
