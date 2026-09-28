# 依存パッケージの注意事項

## ネイティブモジュールは Expo SDK が指定するバージョンにする

`react-native-screens` などネイティブコードを含むパッケージは、`npm install` ではなく `npx expo install` で入れる。SDK を上げたあとは `npx expo install --fix` でまとめて揃え、`npx expo-doctor` で確認する。

### 理由

Expo Go には、SDK ごとに決まったバージョンのネイティブコードが組み込まれている。`package.json` でそれより新しいバージョンを入れても JS 側だけが新しくなり、ネイティブ側との不一致でクラッシュする。

SDK 54 のとき `react-native-screens` 4.17.0 以降を入れると、次のエラーでクラッシュした（software-mansion/react-native-screens#3470）。原因はこの不一致で、ライブラリのバグではなかった。

```
TypeError: expected dynamic type 'boolean', but had type 'string'
```

## npm install の peer dependency の警告

SDK 57 では、`npm install` で次の警告が出る。Expo Go で動かす間は無視してよい。

```
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: expo-modules-core@57.0.19
npm warn Found: react-native-worklets@0.13.0
```

`expo-router` が依存する `react-native-drawer-layout` の peer dependency として、最新の `react-native-reanimated` と `react-native-worklets` が入るため。アプリはこれらを import しておらず、JS のバンドルにも含まれない。

ただし、development build や EAS Build でネイティブコードをビルドするときは、node_modules にあるネイティブモジュールがリンクされる。このとき SDK 57 が想定するバージョン（`react-native-reanimated` 4.5.1、`react-native-worklets` 0.10.1）と違うので、ビルドが失敗したり動作が不安定になったりするおそれがある。その場合は `package.json` の `overrides` でこの2つを SDK 57 のバージョンに固定する。

## expo-sqlite は非同期 API だけを使う

expo-sqlite の Web 版の同期 API（`getAllSync` など）には、次の問題があるので使わない。

- 255 バイトを超える結果が途中で切れて、JSON の読み取りに失敗する（`SyntaxError: Unterminated string in JSON`）。結果の長さを `Uint8Array` に書き込んでいて、下位1バイトしか残らないため。修正 PR は expo/expo#44148（未マージ）
- 起動直後の最初の同期呼び出しがタイムアウトする（`Sync operation timeout`）。worker が起動する前にメインスレッドが待ち続けるため
- 同期呼び出しの間、メインスレッドがビジーループで待つ

非同期 API なら、Web に必要な設定は `metro.config.js` で `.wasm` をアセットとして読み込むようにするだけでよい（COOP/COEP ヘッダーは同期 API にだけ必要）。
