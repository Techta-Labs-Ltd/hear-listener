import { AppText } from "@/components/ui/AppText";
import { playClick } from "@/lib/audio/one-shots";
import { Pressable, View } from "@/tw";
import type { ProviderButtonProps } from "@/types";
import { cn } from "@/utils/styles";
import { ActivityIndicator } from "react-native";
import { SvgXml } from "react-native-svg";
import { appHaptics } from "@/lib/haptics";

const APPLE_LOGO_SVG = `<svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.44443 8.05554C2.41666 8.05554 0 11.2778 0 16.1111C0 22.5555 4.02777 29 8.05554 29C10.4722 29 11.2778 27.3888 13.6944 27.3888C16.1111 27.3888 16.9166 29 19.3333 29C23.3611 29 27.3888 23.3611 27.3888 17.7222C27.3888 12.8889 24.1666 8.8611 20.1389 8.05554C16.9166 8.05554 15.3055 9.66665 13.6944 9.66665C11.2778 9.66665 9.66665 8.05554 6.44443 8.05554Z" fill="white"/><path d="M13.6945 6.44443C13.6945 2.41666 16.9167 0 20.9445 0C20.9445 4.02777 17.7223 6.44443 13.6945 6.44443Z" fill="white"/></svg>`;

const GOOGLE_LOGO_SVG = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.2253 18.9463C19.6139 16.6128 21.28 11.1635 18.9465 6.77482C16.613 2.38617 11.1636 0.720133 6.77499 3.05362C2.38634 5.3871 0.720303 10.8365 3.05379 15.2251C5.38728 19.6138 10.8366 21.2798 15.2253 18.9463Z" stroke="#4285F4" stroke-width="4" stroke-dasharray="15 42"/><path d="M7.19645 19.1566C11.7012 21.2572 17.0559 19.3082 19.1565 14.8035C21.2571 10.2987 19.3082 4.94402 14.8034 2.84342C10.2987 0.742814 4.94395 2.69177 2.84335 7.19653C0.742741 11.7013 2.69169 17.056 7.19645 19.1566Z" stroke="#EA4335" stroke-width="4" stroke-dasharray="14 43"/><path d="M3.36764 6.23083C0.733703 10.446 2.01555 15.9983 6.23074 18.6323C10.4459 21.2662 15.9982 19.9844 18.6322 15.7692C21.2661 11.554 19.9843 6.00168 15.7691 3.36774C11.5539 0.733798 6.00158 2.01565 3.36764 6.23083Z" stroke="#FBBC05" stroke-width="4" stroke-dasharray="12 45"/><path d="M11.4712 2.01246C6.50758 1.75233 2.27287 5.56528 2.01274 10.5289C1.7526 15.4926 5.56555 19.7273 10.5292 19.9874C15.4928 20.2475 19.7275 16.4346 19.9877 11.4709C20.2478 6.5073 16.4349 2.2726 11.4712 2.01246Z" stroke="#34A853" stroke-width="4" stroke-dasharray="18 39"/><path d="M11.0002 11H21" stroke="#4285F4" stroke-width="3.99991"/></svg>`;

function useProviderPress(onPress: () => void) {
  return () => {
    void appHaptics.changed();
    playClick();
    onPress();
  };
}

export function AppleSignInButton({ onPress, loading = false, className }: ProviderButtonProps) {
  const handlePress = useProviderPress(onPress);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      accessibilityHint="Opens secure Apple sign-in."
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={handlePress}
      className={cn(
        "h-12 flex-row items-center justify-center gap-3 rounded-full bg-black active:opacity-70",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator accessibilityElementsHidden color="#FFFFFF" size="small" />
      ) : (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SvgXml xml={APPLE_LOGO_SVG} width={24} height={25} />
        </View>
      )}
      <AppText className="font-body-bold text-base leading-5 text-white">
        {loading ? "Continue with Apple…" : "Continue with Apple"}
      </AppText>
    </Pressable>
  );
}

export function GoogleSignInButton({ onPress, loading = false, className }: ProviderButtonProps) {
  const handlePress = useProviderPress(onPress);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityHint="Opens secure Google sign-in."
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={handlePress}
      className={cn(
        "h-12 flex-row items-center justify-center gap-3 rounded-full border border-[#747775] bg-surface active:opacity-70",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator accessibilityElementsHidden color="#1F1F1F" size="small" />
      ) : (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SvgXml xml={GOOGLE_LOGO_SVG} width={22} height={22} />
        </View>
      )}
      <AppText className="font-body-medium text-base leading-5 text-ink">
        {loading ? "Continue with Google…" : "Continue with Google"}
      </AppText>
    </Pressable>
  );
}
