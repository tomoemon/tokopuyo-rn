import React from 'react';
import { Modal, Pressable, View, StyleSheet, ModalProps, StyleProp, ViewStyle } from 'react-native';

interface DismissableModalProps extends Omit<ModalProps, 'transparent'> {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  overlayStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * 背景タップで閉じることができるモーダル
 * - 背景（オーバーレイ）をタップするとonDismissが呼ばれる
 * - モーダルコンテンツ内のタップはブロックされる
 */
export const DismissableModal: React.FC<DismissableModalProps> = ({
  visible,
  onDismiss,
  children,
  overlayStyle,
  contentStyle,
  ...modalProps
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={onDismiss}
      {...modalProps}
    >
      <Pressable style={[styles.overlay, overlayStyle]} onPress={onDismiss}>
        <Pressable style={contentStyle}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
