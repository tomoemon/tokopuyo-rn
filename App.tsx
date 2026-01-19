import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { TitleScreen, GameScreen, ConfigScreen, GameHistoryScreen, GameReplayScreen } from './src/screens';
import { useGameStore, useGameHistoryStore } from './src/store';
import { GameHistoryEntry } from './src/store/gameHistoryStore';

type Screen = 'title' | 'game' | 'history' | 'replay';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('title');
  const [configVisible, setConfigVisible] = useState(false);
  const [replayEntry, setReplayEntry] = useState<GameHistoryEntry | null>(null);
  const dispatch = useGameStore((state) => state.dispatch);
  const resumeFromHistory = useGameStore((state) => state.resumeFromHistory);
  const getEntry = useGameHistoryStore((state) => state.getEntry);
  const getFavoriteEntry = useGameHistoryStore((state) => state.getFavoriteEntry);

  const handleStartGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
    setCurrentScreen('game');
  }, [dispatch]);

  const handleBackToTitle = useCallback(() => {
    setCurrentScreen('title');
  }, []);

  const handleOpenConfig = useCallback(() => {
    setConfigVisible(true);
  }, []);

  const handleCloseConfig = useCallback(() => {
    setConfigVisible(false);
  }, []);

  const handleOpenHistory = useCallback(() => {
    setCurrentScreen('history');
  }, []);

  const handleBackFromHistory = useCallback(() => {
    setCurrentScreen('title');
  }, []);

  const handleResumeGame = useCallback((gameId: string, fromFavorites: boolean) => {
    const success = resumeFromHistory(gameId, fromFavorites);
    if (success) {
      setCurrentScreen('game');
    }
  }, [resumeFromHistory]);

  const handleReplayGame = useCallback((gameId: string, fromFavorites: boolean) => {
    const entry = fromFavorites ? getFavoriteEntry(gameId) : getEntry(gameId);
    if (entry && entry.operationHistory.length > 0) {
      setReplayEntry(entry);
      setCurrentScreen('replay');
    }
  }, [getEntry, getFavoriteEntry]);

  const handleBackFromReplay = useCallback(() => {
    setReplayEntry(null);
    setCurrentScreen('history');
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {currentScreen === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenConfig={handleOpenConfig}
          onOpenHistory={handleOpenHistory}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen onBackToTitle={handleBackToTitle} onOpenConfig={handleOpenConfig} />
      )}
      {currentScreen === 'history' && (
        <GameHistoryScreen
          onBack={handleBackFromHistory}
          onResumeGame={handleResumeGame}
          onReplayGame={handleReplayGame}
        />
      )}
      {currentScreen === 'replay' && replayEntry && (
        <GameReplayScreen entry={replayEntry} onBack={handleBackFromReplay} />
      )}
      <ConfigScreen visible={configVisible} onClose={handleCloseConfig} />
    </>
  );
}
