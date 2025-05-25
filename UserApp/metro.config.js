// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for resolving Typescript and JavaScript files with the same name
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Remove the problematic resolver.resolveRequest override
// config.resolver.resolveRequest = (context, moduleName, platform) => {
//   // Return null to let Metro handle the resolution
//   return null;
// };

module.exports = withNativeWind(config, { input: './global.css' });