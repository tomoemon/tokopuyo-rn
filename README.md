# 連連 (RenRen)

同じ色を4つつなげて消すパズルゲームの練習アプリ

## 前提条件

### iOS (iPhone) で動かす場合

以下のソフトウェアのインストールが必要です：

1. **Xcode**
   - App Store からインストール
   - インストール後、一度起動してライセンスに同意
   - Command Line Tools もインストールされていることを確認
     ```bash
     xcode-select --install
     ```

2. **watchman**
   - Homebrew でインストール
     ```bash
     brew install watchman
     ```

### Android で動かす場合

- Android Studio のインストールが必要です

## セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd tokopuyo-rn

# 依存関係のインストール
npm install
```

## 実行方法

```bash
# 開発サーバーの起動
npm start

# iOS シミュレータで起動
npm run ios

# Android エミュレータで起動
npm run android

# Web ブラウザで起動
npm run web
```

## テスト

```bash
# ゲームロジックのテスト（vitest）
npm test

# 型チェック
npx tsc --noEmit
```

## Web ブラウザで動作確認する方法

日常的な動作確認は Web ブラウザだけで行えます。

```bash
npm run web
```

- マウスで、タップ（クリック）・スワイプ（ドラッグ）・離す（ハードドロップ）の操作ができます
- データは localStorage に保存され、リロード後もプレイ中のゲームや履歴が残ります
- PC ブラウザでは、アプリ全体をスマホ程度の幅で中央に表示します

Web では次のことを確認できないので、リリース前には実機で確認してください。

- Haptics（触覚フィードバック）
- 実機でのタッチの操作感

## Expo Go で実機確認する方法

iPhone の実機でアプリを動作確認する手順です。

### 1. Expo Go アプリのインストール

iPhone の App Store から「Expo Go」アプリをインストールします。このプロジェクトは Expo SDK 57 を使っているので、SDK 57 に対応した Expo Go が必要です。

iOS シミュレータで確認する場合は `npm run ios` を実行します。対応する Expo Go が自動でインストールされます。

### 2. 開発サーバーの起動

```bash
npm start
```

ターミナルに QR コードが表示されます。

### 3. アプリの起動

1. iPhone のカメラアプリで QR コードをスキャン
2. 表示される通知をタップして Expo Go で開く
3. アプリが自動的にビルドされて起動します

### 注意事項

- iPhone と開発マシンが同じ Wi-Fi ネットワークに接続されている必要があります
- 初回起動時は JavaScript バンドルのダウンロードに時間がかかることがあります

## 詳細仕様

ゲームの詳細仕様については [docs/SPECIFICATION.md](docs/SPECIFICATION.md) を参照してください。操作体系は [docs/control-system.md](docs/control-system.md) にまとめています。
