const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite の Web 版が使う wa-sqlite の .wasm を読み込めるようにする
config.resolver.assetExts.push('wasm');

module.exports = config;
