
import { LanguageConfig } from './types';

export const LANGUAGES: Record<string, LanguageConfig> = {
  'Hindi': { name: 'Hindi', locale: 'hi_in', accent: 'Standard hindi', unicodeRange: /[\u0900-\u097F]/ },
  'Bengali': { name: 'Bengali', locale: 'bn_in', accent: 'Standard bengali', unicodeRange: /[\u0980-\u09FF]/ },
  'Tamil': { name: 'Tamil', locale: 'ta_in', accent: 'Standard tamil', unicodeRange: /[\u0B80-\u0BFF]/ },
  'Telugu': { name: 'Telugu', locale: 'te_in', accent: 'Standard telugu', unicodeRange: /[\u0C00-\u0C7F]/ },
  'Kannada': { name: 'Kannada', locale: 'kn_in', accent: 'Standard kannada', unicodeRange: /[\u0C80-\u0CFF]/ },
  'Malayalam': { name: 'Malayalam', locale: 'ml_in', accent: 'Standard malayalam', unicodeRange: /[\u0D00-\u0D7F]/ },
  'Marathi': { name: 'Marathi', locale: 'mr_in', accent: 'Standard marathi', unicodeRange: /[\u0900-\u097F]/ },
  'Gujarati': { name: 'Gujarati', locale: 'gu_in', accent: 'Standard gujarati', unicodeRange: /[\u0A80-\u0AFF]/ },
  'Punjabi': { name: 'Punjabi', locale: 'pa_in', accent: 'Standard punjabi', unicodeRange: /[\u0A00-\u0A7F]/ },
  'Urdu': { name: 'Urdu', locale: 'ur_in', accent: 'Standard urdu', unicodeRange: /[\u0600-\u06FF]/ },
  'English': { name: 'English', locale: 'en_in', accent: 'Indian english' }
};

export const LANGUAGE_LIST = Object.keys(LANGUAGES);

export const EMOTIONS = [
  'neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'confused'
];

export const FONT_MAPPING: Record<string, string> = {
  'hi_in': "'Noto Sans Devanagari', sans-serif",
  'mr_in': "'Noto Sans Devanagari', sans-serif",
  'bn_in': "'Noto Sans Bengali', sans-serif",
  'ta_in': "'Noto Sans Tamil', sans-serif",
  'te_in': "'Noto Sans Telugu', sans-serif",
  'kn_in': "'Noto Sans Kannada', sans-serif",
  'ml_in': "'Noto Sans Malayalam', sans-serif",
  'gu_in': "'Noto Sans Gujarati', sans-serif",
  'pa_in': "'Noto Sans Gurmukhi', sans-serif",
  'ur_in': "'Noto Nastaliq Urdu', serif"
};
