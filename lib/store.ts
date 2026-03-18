'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlayerProfile, GameId, DifficultyLevel } from './types';

interface CompletedLevel {
  gameId: GameId;
  level: DifficultyLevel;
  bestMs: number;
  completedAt: number;
}

interface StoreState {
  player: PlayerProfile | null;
  completedLevels: CompletedLevel[];
  totalPoints: number;
  answeredQuestions: string[];

  setPlayer: (p: PlayerProfile) => void;
  recordCompletion: (gameId: GameId, level: DifficultyLevel, elapsedMs: number) => void;
  isLevelCompleted: (gameId: GameId, level: DifficultyLevel) => boolean;
  getBestTime: (gameId: GameId, level: DifficultyLevel) => number | null;
  getPointsForGame: (gameId: GameId) => number;
  markQuestionAnswered: (questionId: string) => void;
  isQuestionAnswered: (questionId: string) => boolean;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      player: null,
      completedLevels: [],
      totalPoints: 0,
      answeredQuestions: [],

      setPlayer: (player) => set({ player }),

      recordCompletion: (gameId, level, elapsedMs) => {
        const { completedLevels } = get();
        const existing = completedLevels.find(
          (c) => c.gameId === gameId && c.level === level
        );

        if (existing) {
          // Update best time only
          set({
            completedLevels: completedLevels.map((c) =>
              c.gameId === gameId && c.level === level
                ? { ...c, bestMs: Math.min(c.bestMs, elapsedMs), completedAt: Date.now() }
                : c
            ),
          });
        } else {
          // New completion = +1 point
          set({
            completedLevels: [
              ...completedLevels,
              { gameId, level, bestMs: elapsedMs, completedAt: Date.now() },
            ],
            totalPoints: get().totalPoints + 1,
          });
        }
      },

      isLevelCompleted: (gameId, level) =>
        get().completedLevels.some((c) => c.gameId === gameId && c.level === level),

      getBestTime: (gameId, level) =>
        get().completedLevels.find((c) => c.gameId === gameId && c.level === level)?.bestMs ?? null,

      getPointsForGame: (gameId) =>
        get().completedLevels.filter((c) => c.gameId === gameId).length,

      markQuestionAnswered: (questionId) =>
        set({ answeredQuestions: [...new Set([...get().answeredQuestions, questionId])] }),

      isQuestionAnswered: (questionId) =>
        get().answeredQuestions.includes(questionId),
    }),
    { name: 'shlagonie-store' }
  )
);
