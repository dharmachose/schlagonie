import type { DifficultyLevel } from '@/lib/types';

export type QuestionType = 'orthography' | 'statistics';

export interface AlloQuestion {
  id: string;
  type: QuestionType;
  customerEmoji: string;
  customerName: string;
  customerMessage: string;
  responseBefore: string;
  responseAfter: string;
  options: string[];
  correct: string;
  explanation: string;
  points: number;
  minLevel: DifficultyLevel;
}
