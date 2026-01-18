import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { useGameHistoryStore, GameHistoryEntry } from '../store';
import {
  FIELD_COLS,
  VISIBLE_ROWS,
  HIDDEN_ROWS,
  PuyoColor,
} from '../logic/types';

interface GameHistoryScreenProps {
  onBack: () => void;
  onResumeGame: (gameId: string) => void;
}

// 色の定義
const COLOR_MAP: Record<PuyoColor, string> = {
  red: '#FF4444',
  blue: '#4444FF',
  green: '#44FF44',
  yellow: '#FFFF44',
};

// サムネイルのセルサイズ
const CELL_SIZE = 8;

// 日時を見やすい形式に変換
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// フィールドサムネイルコンポーネント
const FieldThumbnail: React.FC<{ entry: GameHistoryEntry }> = ({ entry }) => {
  const fieldWidth = FIELD_COLS * CELL_SIZE;
  const fieldHeight = VISIBLE_ROWS * CELL_SIZE;

  return (
    <View style={[styles.fieldBorder, { width: fieldWidth + 2, height: fieldHeight + 2 }]}>
      <View
        style={[
          styles.field,
          {
            width: fieldWidth,
            height: fieldHeight,
          },
        ]}
      >
        {/* フィールド上のぷよ */}
        {entry.field.map((row, y) =>
          row.map((color, x) => {
            if (color === null) return null;
            const displayY = y - HIDDEN_ROWS;
            if (displayY < 0) return null;

            return (
              <View
                key={`${x}-${y}`}
                style={[
                  styles.puyo,
                  {
                    left: x * CELL_SIZE,
                    top: displayY * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  },
                ]}
              >
                <View
                  style={[
                    styles.puyoInner,
                    {
                      width: CELL_SIZE - 1,
                      height: CELL_SIZE - 1,
                      backgroundColor: COLOR_MAP[color],
                    },
                  ]}
                />
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

// ゲーム履歴アイテムコンポーネント
const GameHistoryItem: React.FC<{
  entry: GameHistoryEntry;
  onPress: () => void;
  onDelete: () => void;
}> = ({ entry, onPress, onDelete }) => {
  return (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress} activeOpacity={0.7}>
      <FieldThumbnail entry={entry} />
      <View style={styles.itemInfo}>
        <Text style={styles.dateText}>{formatDate(entry.lastPlayedAt)}</Text>
        <Text style={styles.scoreText}>Score: {entry.score}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.dropCountText}>Drops: {entry.dropCount}</Text>
          {entry.maxChainCount > 0 && (
            <Text style={styles.chainText}>Chain: {entry.maxChainCount}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Text style={styles.deleteButtonText}>x</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const GameHistoryScreen: React.FC<GameHistoryScreenProps> = ({ onBack, onResumeGame }) => {
  const entries = useGameHistoryStore((state) => state.entries);
  const deleteEntry = useGameHistoryStore((state) => state.deleteEntry);
  const clearAllHistory = useGameHistoryStore((state) => state.clearAllHistory);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resumeConfirmId, setResumeConfirmId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // 新しい順にソート
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
  );

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      deleteEntry(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleResumeConfirm = () => {
    if (resumeConfirmId) {
      onResumeGame(resumeConfirmId);
      setResumeConfirmId(null);
    }
  };

  const handleClearAll = () => {
    clearAllHistory();
    setShowClearAllModal(false);
  };

  const resumeEntry = sortedEntries.find(e => e.id === resumeConfirmId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Game History</Text>
        {entries.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={() => setShowClearAllModal(true)}
          >
            <Text style={styles.clearAllButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {sortedEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No game history yet.</Text>
          <Text style={styles.emptySubText}>Play a game to see it here!</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {sortedEntries.map((entry) => (
            <GameHistoryItem
              key={entry.id}
              entry={entry}
              onPress={() => setResumeConfirmId(entry.id)}
              onDelete={() => setDeleteConfirmId(entry.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* 再開確認モーダル */}
      <Modal
        visible={resumeConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setResumeConfirmId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resume this game?</Text>
            {resumeEntry && (
              <View style={styles.resumeInfo}>
                <Text style={styles.resumeInfoText}>
                  Score: {resumeEntry.score} | Drops: {resumeEntry.dropCount}
                </Text>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setResumeConfirmId(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalResumeButton}
                onPress={handleResumeConfirm}
              >
                <Text style={styles.modalResumeText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        visible={deleteConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete this entry?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDeleteConfirmId(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 全削除確認モーダル */}
      <Modal
        visible={showClearAllModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clear all history?</Text>
            <Text style={styles.modalSubtext}>This action cannot be undone.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowClearAllModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleClearAll}
              >
                <Text style={styles.modalDeleteText}>Clear All</Text>
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
    backgroundColor: '#0a0a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  clearAllButtonText: {
    color: '#ff4444',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubText: {
    color: '#666',
    fontSize: 14,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a5a',
    alignItems: 'center',
  },
  fieldBorder: {
    borderWidth: 1,
    borderColor: '#4a4a6a',
  },
  field: {
    backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  puyo: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  puyoInner: {
    borderRadius: 100,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  dateText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  scoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dropCountText: {
    color: '#88aaff',
    fontSize: 14,
    marginRight: 12,
  },
  chainText: {
    color: '#ffaa44',
    fontSize: 14,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#888',
    fontSize: 18,
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
    padding: 24,
    width: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtext: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  resumeInfo: {
    marginBottom: 8,
  },
  resumeInfoText: {
    color: '#aaa',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ff4444',
    marginLeft: 8,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalResumeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4488ff',
    marginLeft: 8,
    alignItems: 'center',
  },
  modalResumeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
