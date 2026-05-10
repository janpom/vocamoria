export type Word = {
  id: string;
  term: string;
  translation: string;
  lesson?: string;
  alternates?: string[];
};

export type VocabSettings = {
  articlePrefixes: string[];
};

export type Vocab = {
  settings: VocabSettings;
  words: Word[];
};

export type WordStats = {
  seen: number;
  correct: number;
  lastSeen: string;
  nextDue: string;
  box: number;
};

export type Streak = {
  count: number;
  lastPlayedDate: string;
};

export type Progress = {
  words: Record<string, WordStats>;
  streak: Streak;
  totalXP: number;
};
