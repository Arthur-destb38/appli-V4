const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const { assetExts, sourceExts } = config.resolver;

config.resolver.assetExts = [...assetExts, 'wasm'];
config.resolver.sourceExts = sourceExts.filter((ext) => ext !== 'wasm');

module.exports = config;
