import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useConfigStore, Handedness } from '../store';

interface ConfigScreenProps {
  onBack: () => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ onBack }) => {
  const handedness = useConfigStore((state) => state.handedness);
  const setHandedness = useConfigStore((state) => state.setHandedness);

  const handleSelectHandedness = (value: Handedness) => {
    setHandedness(value);
  };

  return (
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
              handedness === 'right' && styles.optionButtonSelected,
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
                  handedness === 'right' && styles.optionTextSelected,
                ]}
              >
                Right-handed
              </Text>
              <Text style={styles.optionSubtext}>Field on right</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              handedness === 'left' && styles.optionButtonSelected,
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
                  handedness === 'left' && styles.optionTextSelected,
                ]}
              >
                Left-handed
              </Text>
              <Text style={styles.optionSubtext}>Field on left</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 40,
    textAlign: 'center',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
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
    width: 80,
    height: 60,
    marginBottom: 12,
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
    width: 30,
    height: 50,
    backgroundColor: '#4444ff',
    borderRadius: 4,
  },
  previewHistory: {
    width: 20,
    height: 40,
    backgroundColor: '#444466',
    borderRadius: 4,
  },
  optionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888888',
    marginBottom: 4,
  },
  optionTextSelected: {
    color: '#ffffff',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666666',
  },
  backButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#666666',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  backButtonText: {
    color: '#888888',
    fontSize: 18,
  },
});
