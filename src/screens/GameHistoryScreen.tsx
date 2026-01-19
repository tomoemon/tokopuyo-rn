import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useGameHistoryStore, GameHistoryEntry } from '../store';
import {
  FIELD_COLS,
  VISIBLE_ROWS,
  HIDDEN_ROWS,
  PuyoColor,
} from '../logic/types';
import { DismissableModal } from '../components';

interface GameHistoryScreenProps {
  onBack: () => void;
  onResumeGame: (gameId: string, fromFavorites: boolean) => void;
  onReplayGame: (gameId: string, fromFavorites: boolean) => void;
}

type TabType = 'history' | 'favorite';

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

// ゲーム履歴アイテムコンポーネント（History用）
const HistoryItem: React.FC<{
  entry: GameHistoryEntry;
  isInFavorites: boolean;
  onPress: () => void;
  onAddToFavorite: () => void;
  onMenuPress: () => void;
}> = ({ entry, isInFavorites, onPress, onAddToFavorite, onMenuPress }) => {
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
      {isInFavorites ? (
        <View style={styles.iconButton}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            onAddToFavorite();
          }}
        >
          <Text style={styles.starIcon}>☆</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.menuIconButton}
        onPress={(e) => {
          e.stopPropagation();
          onMenuPress();
        }}
      >
        <Text style={styles.menuIcon}>⋮</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// お気に入りアイテムコンポーネント（Favorite用）
const FavoriteItem: React.FC<{
  entry: GameHistoryEntry;
  onPress: () => void;
  onMenuPress: () => void;
  onEdit: () => void;
}> = ({ entry, onPress, onMenuPress, onEdit }) => {
  const tags = entry.tags || [];
  return (
    <TouchableOpacity style={styles.favoriteItemContainer} onPress={onPress} activeOpacity={0.7}>
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
        {entry.note && (
          <Text style={styles.noteText} numberOfLines={1}>
            {entry.note}
          </Text>
        )}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <Text style={styles.penIcon}>✎</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.menuIconButton}
        onPress={(e) => {
          e.stopPropagation();
          onMenuPress();
        }}
      >
        <Text style={styles.menuIcon}>⋮</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const GameHistoryScreen: React.FC<GameHistoryScreenProps> = ({ onBack, onResumeGame, onReplayGame }) => {
  const entries = useGameHistoryStore((state) => state.entries);
  const favorites = useGameHistoryStore((state) => state.favorites);
  const deleteEntry = useGameHistoryStore((state) => state.deleteEntry);
  const deleteFavorite = useGameHistoryStore((state) => state.deleteFavorite);
  const addToFavorites = useGameHistoryStore((state) => state.addToFavorites);
  const isInFavorites = useGameHistoryStore((state) => state.isInFavorites);
  const updateFavoriteDetails = useGameHistoryStore((state) => state.updateFavoriteDetails);

  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteFromFavorites, setDeleteFromFavorites] = useState(false);
  // Resume モーダル用の状態（キャッシュでアニメーション中もデータを保持）
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [resumeEntryCache, setResumeEntryCache] = useState<{
    id: string;
    score: number;
    dropCount: number;
    fromFavorites: boolean;
  } | null>(null);
  // 編集モーダル用の状態
  const [editId, setEditId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTagText, setNewTagText] = useState('');
  // タグ検索用の状態
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterSearchText, setFilterSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Favorite で使われているタグを頻度順に取得
  const tagsByFrequency = useMemo(() => {
    const tagCount: Record<string, number> = {};
    favorites.forEach(entry => {
      (entry.tags || []).forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [favorites]);

  // 検索テキストに基づく補完候補
  const autocompleteSuggestions = useMemo(() => {
    if (!filterSearchText.trim()) return [];
    const searchLower = filterSearchText.toLowerCase();
    return tagsByFrequency.filter(
      tag => tag.toLowerCase().includes(searchLower) && !filterTags.includes(tag)
    );
  }, [filterSearchText, tagsByFrequency, filterTags]);

  // 現在のタブに応じたリスト
  const currentList = activeTab === 'favorite' ? favorites : entries;

  // フィルタリング（Favorite タブの場合のみ）
  const filteredList = useMemo(() => {
    if (activeTab !== 'favorite' || filterTags.length === 0) {
      return currentList;
    }
    return currentList.filter(entry => {
      const entryTags = entry.tags || [];
      return filterTags.every(filterTag => entryTags.includes(filterTag));
    });
  }, [activeTab, currentList, filterTags]);

  // 新しい順にソート
  const sortedList = [...filteredList].sort(
    (a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
  );

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      if (deleteFromFavorites) {
        deleteFavorite(deleteConfirmId);
      } else {
        deleteEntry(deleteConfirmId);
      }
      setDeleteConfirmId(null);
      setDeleteFromFavorites(false);
    }
  };

  const handleOpenResumeModal = (entry: GameHistoryEntry, fromFavorites: boolean) => {
    setResumeEntryCache({
      id: entry.id,
      score: entry.score,
      dropCount: entry.dropCount,
      fromFavorites,
    });
    setResumeModalVisible(true);
  };

  const handleCloseResumeModal = () => {
    setResumeModalVisible(false);
    // キャッシュはクリアしない（アニメーション中に表示を維持するため）
  };

  const handleResumeConfirm = () => {
    if (resumeEntryCache) {
      onResumeGame(resumeEntryCache.id, resumeEntryCache.fromFavorites);
      setResumeModalVisible(false);
    }
  };

  const handleReplayConfirm = () => {
    if (resumeEntryCache) {
      onReplayGame(resumeEntryCache.id, resumeEntryCache.fromFavorites);
      setResumeModalVisible(false);
    }
  };

  const handleOpenEditModal = (entryId: string) => {
    const entry = favorites.find(e => e.id === entryId);
    if (entry) {
      setEditId(entry.id);
      setEditNote(entry.note || '');
      setEditTags(entry.tags || []);
      setNewTagText('');
    }
  };

  const handleSaveEdit = () => {
    if (editId) {
      updateFavoriteDetails(editId, editNote, editTags);
      setEditId(null);
      setEditNote('');
      setEditTags([]);
      setNewTagText('');
    }
  };

  const handleAddTag = () => {
    const trimmedTag = newTagText.trim();
    if (trimmedTag && !editTags.includes(trimmedTag)) {
      setEditTags([...editTags, trimmedTag]);
      setNewTagText('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  // フィルタータグの追加
  const handleAddFilterTag = (tag: string) => {
    if (!filterTags.includes(tag)) {
      setFilterTags([...filterTags, tag]);
    }
    setFilterSearchText('');
    setShowSuggestions(false);
  };

  // フィルタータグの削除
  const handleRemoveFilterTag = (tag: string) => {
    setFilterTags(filterTags.filter(t => t !== tag));
  };

  // フィルターのクリア
  const handleClearFilter = () => {
    setFilterTags([]);
    setFilterSearchText('');
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Game History</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* タブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorite' && styles.tabActive]}
          onPress={() => setActiveTab('favorite')}
        >
          <Text style={[styles.tabText, activeTab === 'favorite' && styles.tabTextActive]}>
            Favorite
          </Text>
        </TouchableOpacity>
      </View>

      {/* Favorite タブ用のタグ検索バー */}
      {activeTab === 'favorite' && (
        <View style={styles.filterContainer}>
          {/* 選択中のフィルタータグ */}
          {filterTags.length > 0 && (
            <View style={styles.selectedFilterTags}>
              {filterTags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.selectedFilterTag}
                  onPress={() => handleRemoveFilterTag(tag)}
                >
                  <Text style={styles.selectedFilterTagText}>{tag}</Text>
                  <Text style={styles.selectedFilterTagRemove}>×</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.clearFilterButton} onPress={handleClearFilter}>
                <Text style={styles.clearFilterText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 検索入力 */}
          <View style={styles.filterInputContainer}>
            <TextInput
              style={styles.filterInput}
              value={filterSearchText}
              onChangeText={(text) => {
                setFilterSearchText(text);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by tag..."
              placeholderTextColor="#666"
            />
          </View>

          {/* オートコンプリート候補 */}
          {showSuggestions && autocompleteSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {autocompleteSuggestions.slice(0, 5).map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.selectableTag}
                  onPress={() => handleAddFilterTag(tag)}
                >
                  <Text style={styles.selectableTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 人気のタグ（検索中でない場合、タグがある場合のみ） */}
          {!filterSearchText && tagsByFrequency.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.popularTagsList}>
                {tagsByFrequency
                  .filter(tag => !filterTags.includes(tag))
                  .slice(0, 10)
                  .map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.selectableTag}
                      onPress={() => handleAddFilterTag(tag)}
                    >
                      <Text style={styles.selectableTagText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {sortedList.length === 0 ? (
        <View style={styles.emptyContainer}>
          {activeTab === 'history' ? (
            <>
              <Text style={styles.emptyText}>No game history yet.</Text>
              <Text style={styles.emptySubText}>Play a game to see it here!</Text>
            </>
          ) : filterTags.length > 0 ? (
            <>
              <Text style={styles.emptyText}>No matches found.</Text>
              <Text style={styles.emptySubText}>Try different tags or clear the filter.</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>No favorites yet.</Text>
              <Text style={styles.emptySubText}>Tap the star icon to add favorites!</Text>
            </>
          )}
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {activeTab === 'history'
            ? sortedList.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  isInFavorites={isInFavorites(entry.id)}
                  onPress={() => handleOpenResumeModal(entry, false)}
                  onAddToFavorite={() => addToFavorites(entry.id)}
                  onMenuPress={() => {
                    setDeleteConfirmId(entry.id);
                    setDeleteFromFavorites(false);
                  }}
                />
              ))
            : sortedList.map((entry) => (
                <FavoriteItem
                  key={entry.id}
                  entry={entry}
                  onPress={() => handleOpenResumeModal(entry, true)}
                  onMenuPress={() => {
                    setDeleteConfirmId(entry.id);
                    setDeleteFromFavorites(true);
                  }}
                  onEdit={() => handleOpenEditModal(entry.id)}
                />
              ))}
        </ScrollView>
      )}

      {/* 再開/再生 選択モーダル */}
      <DismissableModal
        visible={resumeModalVisible}
        onDismiss={handleCloseResumeModal}
        animationType="fade"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select action</Text>
          {resumeEntryCache && (
            <View style={styles.resumeInfo}>
              <Text style={styles.resumeInfoText}>
                Score: {resumeEntryCache.score} | Drops: {resumeEntryCache.dropCount}
              </Text>
            </View>
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleResumeConfirm}
            >
              <Text style={styles.actionButtonText}>Resume</Text>
              <Text style={styles.actionButtonSubtext}>Continue playing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleReplayConfirm}
            >
              <Text style={styles.actionButtonText}>Replay</Text>
              <Text style={styles.actionButtonSubtext}>Watch the game</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.modalCancelButtonFull}
            onPress={handleCloseResumeModal}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </DismissableModal>

      {/* 編集モーダル */}
      <Modal
        visible={editId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditId(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <Text style={styles.modalTitle}>Edit Favorite</Text>

              {/* Note セクション */}
              <Text style={styles.editSectionLabel}>Note</Text>
              <TextInput
                style={styles.noteInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Enter a note..."
                placeholderTextColor="#666"
                multiline
                maxLength={200}
              />

              {/* Tags セクション */}
              <Text style={styles.editSectionLabel}>Tags</Text>
              <View style={styles.tagsEditContainer}>
                {editTags.map((tag, index) => (
                  <View key={index} style={styles.tagEditBadge}>
                    <Text style={styles.tagEditText}>{tag}</Text>
                    <TouchableOpacity
                      style={styles.tagRemoveButton}
                      onPress={() => handleRemoveTag(tag)}
                    >
                      <Text style={styles.tagRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.tagInputRow}>
                <TextInput
                  style={styles.tagInput}
                  value={newTagText}
                  onChangeText={setNewTagText}
                  placeholder="Add a tag..."
                  placeholderTextColor="#666"
                  maxLength={20}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity
                  style={styles.tagAddButton}
                  onPress={handleAddTag}
                >
                  <Text style={styles.tagAddButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setEditId(null);
                    setEditNote('');
                    setEditTags([]);
                    setNewTagText('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalResumeButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.modalResumeText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 削除確認モーダル */}
      <DismissableModal
        visible={deleteConfirmId !== null}
        onDismiss={() => setDeleteConfirmId(null)}
        animationType="fade"
      >
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
      </DismissableModal>
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
  headerPlaceholder: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4488ff',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
  },
  tabTextActive: {
    color: '#4488ff',
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: '#0a0a1a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
  },
  selectedFilterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  selectedFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4488ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedFilterTagText: {
    color: '#fff',
    fontSize: 13,
  },
  selectedFilterTagRemove: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 6,
    fontWeight: 'bold',
  },
  clearFilterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFilterText: {
    color: '#888',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  filterInputContainer: {
    marginBottom: 8,
  },
  filterInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a5a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  popularTagsList: {
    flexDirection: 'row',
    gap: 6,
  },
  selectableTag: {
    backgroundColor: '#2a2a4a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectableTagText: {
    color: '#aaccff',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    height: 122,
  },
  favoriteItemContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a5a',
    alignItems: 'center',
    height: 122,
    overflow: 'hidden',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: 4,
    gap: 4,
    overflow: 'hidden',
  },
  tagBadge: {
    backgroundColor: '#3a3a6a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    color: '#aaccff',
    fontSize: 11,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 22,
    color: '#ffcc00',
  },
  checkIcon: {
    fontSize: 20,
    color: '#44cc44',
  },
  penIcon: {
    fontSize: 18,
    color: '#aaa',
  },
  menuIconButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#888',
    fontWeight: 'bold',
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
    marginLeft: 12,
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
  noteText: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
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
    width: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  editModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 24,
    width: 320,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  editSectionLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  tagsEditContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 30,
  },
  tagEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a6a',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagEditText: {
    color: '#aaccff',
    fontSize: 13,
  },
  tagRemoveButton: {
    marginLeft: 4,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagRemoveText: {
    color: '#ff6666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tagInputRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a5a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  tagAddButton: {
    backgroundColor: '#4488ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  tagAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resumeInfo: {
    marginBottom: 16,
  },
  resumeInfoText: {
    color: '#aaa',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(68, 136, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#4488ff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#4488ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonSubtext: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  modalCancelButtonFull: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  noteInput: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#0a0a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a5a',
    color: '#fff',
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginTop: 8,
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
