# tokopuyo-rn

React Native (Expo) で作るぷよぷよ風パズルゲーム

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

iOS の場合、Expo Go アプリを iPhone にインストールして、表示される QR コードをスキャンすることで実機でも動作確認できます。

## 詳細仕様

ゲームの詳細仕様については [docs/SPECIFICATION.md](docs/SPECIFICATION.md) を参照してください。
