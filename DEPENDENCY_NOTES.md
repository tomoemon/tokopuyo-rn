# 依存パッケージの注意事項

## react-native-screens のバージョン固定

`react-native-screens` は **4.16.0** に固定する必要がある。

### 理由

バージョン 4.17.0 以降で Expo SDK 54 + React Native の新アーキテクチャ（Fabric）との組み合わせでクラッシュが発生するリグレッションバグがある。

### エラーメッセージ

```
TypeError: expected dynamic type 'boolean', but had type 'string'
```

Android では以下のエラーが発生する：

```
java.lang.String cannot be cast to java.lang.Boolean
```

### 参考

- GitHub Issue: https://github.com/software-mansion/react-native-screens/issues/3470

### バージョンアップ時の注意

バージョンを上げる場合は、上記 issue が解決されているか確認すること。
