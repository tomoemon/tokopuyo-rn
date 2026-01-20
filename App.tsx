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
  // game 画面の遷移元を記憶（Back ボタンで戻る先）
  const [gameSourceScreen, setGameSourceScreen] = useState<'title' | 'history'>('title');
  const dispatch = useGameStore((state) => state.dispatch);
  const resumeFromHistory = useGameStore((state) => state.resumeFromHistory);
  const getEntry = useGameHistoryStore((state) => state.getEntry);
  const getFavoriteEntry = useGameHistoryStore((state) => state.getFavoriteEntry);

  const handleStartGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
    setGameSourceScreen('title');
    setCurrentScreen('game');
  }, [dispatch]);

  const handleBackFromGame = useCallback(() => {
    setCurrentScreen(gameSourceScreen);
  }, [gameSourceScreen]);

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
      setGameSourceScreen('history');
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
        <GameScreen onBackToTitle={handleBackFromGame} onOpenConfig={handleOpenConfig} />
      )}
      {currentScreen === 'history' && (
        <GameHistoryScreen
          onBack={handleBackFromHistory}
          onResumeGame={handleResumeGame}
          onReplayGame={handleReplayGame}
        />
      )}
      {currentScreen === 'replay' && replayEntry && (
        <GameReplayScreen entry={replayEntry} onBack={handleBackFromReplay} onOpenConfig={handleOpenConfig} />
      )}
      <ConfigScreen visible={configVisible} onClose={handleCloseConfig} />
    </>
  );
}
