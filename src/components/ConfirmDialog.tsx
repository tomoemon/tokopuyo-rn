import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DismissableModal } from './DismissableModal';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 破壊的な操作の確認ダイアログ
 * （Alert.alert は Web でボタン付きのダイアログを表示できないため、全プラットフォームでこれを使う）
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  confirmText,
  onConfirm,
  onCancel,
}) => {
  return (
    <DismissableModal visible={visible} onDismiss={onCancel} animationType="fade">
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.buttons}>
          {/* 閉じるアニメーション中の連打で onConfirm / onCancel が二重に呼ばれないようにする */}
          <TouchableOpacity style={styles.cancelButton} onPress={visible ? onCancel : undefined}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={visible ? onConfirm : undefined}>
            <Text style={styles.confirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DismissableModal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 24,
    width: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ff4444',
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
