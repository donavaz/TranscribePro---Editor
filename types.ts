
export interface Utterance {
  id: string;
  speaker: string;
  start_time: number;
  end_time: number;
  transcript: string;
  emotion: string;
  language: string;
  locale: string;
  accent: string;
}

export type ExportFormat = 'xlsx' | 'json' | 'ass' | 'srt' | 'vtt' | 'txt';

export enum Emotion {
  Neutral = 'neutral',
  Happy = 'happy',
  Sad = 'sad',
  Angry = 'angry',
  Surprised = 'surprised',
  Fearful = 'fearful',
  Confused = 'confused'
}

export interface LanguageConfig {
  name: string;
  locale: string;
  accent: string;
  unicodeRange?: RegExp;
}
