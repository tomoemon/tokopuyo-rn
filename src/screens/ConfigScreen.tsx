import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useConfigStore, Handedness } from '../store';

interface ConfigScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ visible, onClose }) => {
  const handedness = useConfigStore((state) => state.handedness);
  const setHandedness = useConfigStore((state) => state.setHandedness);

  const handleSelectHandedness = (value: Handedness) => {
    setHandedness(value);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Config</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Handedness</Text>
            <Text style={styles.sectionDescription}>
              Select which side the game field should appear
            </Text>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  handedness === 'left' ? styles.optionButtonSelected : undefined,
                ]}
                onPress={() => handleSelectHandedness('left')}
              >
                <View style={styles.optionContent}>
                  <View style={styles.previewContainer}>
                    <View style={styles.previewLeft}>
                      <View style={styles.previewField} />
                    </View>
                    <View style={styles.previewRight}>
                      <View style={styles.previewHistory} />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      handedness === 'left' ? styles.optionTextSelected : undefined,
                    ]}
                  >
                    Left-handed
                  </Text>
                  <Text style={styles.optionSubtext}>Field on left</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  handedness === 'right' ? styles.optionButtonSelected : undefined,
                ]}
                onPress={() => handleSelectHandedness('right')}
              >
                <View style={styles.optionContent}>
                  <View style={styles.previewContainer}>
                    <View style={styles.previewLeft}>
                      <View style={styles.previewHistory} />
                    </View>
                    <View style={styles.previewRight}>
                      <View style={styles.previewField} />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      handedness === 'right' ? styles.optionTextSelected : undefined,
                    ]}
                  >
                    Right-handed
                  </Text>
                  <Text style={styles.optionSubtext}>Field on right</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  container: {
    backgroundColor: '#0a0a1a',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '90%',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#2a2a4a',
  },
  optionButtonSelected: {
    borderColor: '#4444ff',
    backgroundColor: '#1a1a3e',
  },
  optionContent: {
    alignItems: 'center',
  },
  previewContainer: {
    flexDirection: 'row',
    width: 60,
    height: 45,
    marginBottom: 8,
    gap: 4,
  },
  previewLeft: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewRight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewField: {
    width: 22,
    height: 38,
    backgroundColor: '#4444ff',
    borderRadius: 4,
  },
  previewHistory: {
    width: 15,
    height: 30,
    backgroundColor: '#444466',
    borderRadius: 4,
  },
  optionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888888',
    marginBottom: 2,
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  optionSubtext: {
    fontSize: 11,
    color: '#666666',
  },
  closeButton: {
    backgroundColor: '#4444ff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
