module.exports = function (api) {
  api.cache(true);
  return {
    // zustand の ESM 版（Web で使われる）が使う import.meta を変換する
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
