import React, { useRef, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Modal, Text, TouchableOpacity } from 'react-native';
import { GameSnapshot } from '../../logic/types';
import { HistoryThumbnail } from './HistoryThumbnail';

interface OperationHistoryProps {
  history: GameSnapshot[];
  cellSize: number;
  onRestoreToSnapshot: (snapshotId: number) => void;
}

export const OperationHistory: React.FC<OperationHistoryProps> = ({
  history,
  cellSize,
  onRestoreToSnapshot,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null>(null);

  // 新しい履歴が追加されたら一番下にスクロール
  useEffect(() => {
    if (scrollViewRef.current && history.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [history.length]);

  const handleThumbnailPress = (snapshotId: number) => {
    setSelectedSnapshotId(snapshotId);
    setConfirmModalVisible(true);
  };

  const handleConfirmRestore = () => {
    if (selectedSnapshotId !== null) {
      onRestoreToSnapshot(selectedSnapshotId);
    }
    setConfirmModalVisible(false);
    setSelectedSnapshotId(null);
  };

  const handleCancelRestore = () => {
    setConfirmModalVisible(false);
    setSelectedSnapshotId(null);
  };

  // 履歴を逆順にして表示（最新が下、古いのが上）
  const reversedHistory = [...history].reverse();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>履歴</Text>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {reversedHistory.map((snapshot, index) => (
          <HistoryThumbnail
            key={snapshot.id}
            snapshot={snapshot}
            cellSize={cellSize}
            onPress={() => handleThumbnailPress(snapshot.id)}
            isLatest={index === reversedHistory.length - 1}
          />
        ))}
      </ScrollView>

      {/* 確認ダイアログ */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelRestore}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>履歴に戻る</Text>
            <Text style={styles.modalMessage}>
              この状態に戻りますか？{'\n'}
              以降の操作は取り消されます。
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelRestore}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmRestore}
              >
                <Text style={styles.confirmButtonText}>戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 26, 0.8)',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  title: {
    color: '#8888aa',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'column-reverse',
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    borderWidth: 2,
    borderColor: '#4a4a6a',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    color: '#aaaacc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#3a3a5a',
  },
  cancelButtonText: {
    color: '#aaaacc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#4444ff',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
