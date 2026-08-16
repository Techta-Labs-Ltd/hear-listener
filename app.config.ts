import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];

  if (webClientId) {
    const clientPrefix = webClientId.replace(/\.apps\.googleusercontent\.com$/, "");
    plugins.push([
      "react-native-nitro-google-signin",
      { iosUrlScheme: `com.googleusercontent.apps.${clientPrefix}` },
    ]);
  }

  return {
    ...config,
    name: config.name ?? "Hear!",
    slug: config.slug ?? "hear-listener",
    plugins,
  } as ExpoConfig;
};
