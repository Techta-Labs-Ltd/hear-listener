const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const { resolve } = require("node:path");

const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

for (const extension of ["db", "wasm"]) {
  if (!config.resolver.assetExts.includes(extension)) {
    config.resolver.assetExts.push(extension);
  }
}

const webStubs = [
  "react-native-nitro-google-signin",
  "react-native-nitro-modules",
];

const parentResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && webStubs.includes(moduleName)) {
    return {
      type: "sourceFile",
      filePath: resolve(__dirname, "web-stubs", `${moduleName}.stub.js`),
    };
  }
  return parentResolver
    ? parentResolver(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});
