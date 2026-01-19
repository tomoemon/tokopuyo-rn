# 共通コンポーネント

## DismissableModal (src/components/DismissableModal.tsx)

背景タップで閉じることができるモーダルコンポーネント。

### 使用例
```tsx
<DismissableModal
  visible={isVisible}
  onDismiss={() => setIsVisible(false)}
  animationType="fade"
>
  <View>{/* モーダルコンテンツ */}</View>
</DismissableModal>
```

### Props
- `visible`: モーダルの表示状態
- `onDismiss`: 閉じる時のコールバック
- `children`: モーダルコンテンツ
- `overlayStyle`: オーバーレイのスタイル（オプション）
- `contentStyle`: コンテンツのスタイル（オプション）
- その他 ModalProps を継承

### 実装詳細
- `Pressable` を使用した標準的な実装
- 背景タップで `onDismiss` コールバックが呼ばれる
- コンテンツ内のタップはイベントを吸収（閉じない）
