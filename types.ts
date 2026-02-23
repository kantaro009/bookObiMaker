
export interface Book {
  title: string;
  author: string;
  isbn?: string;
  imageUrl?: string;
  publisher?: string;
  source?: 'ndl' | 'openbd' | 'openlibrary'; // データソース識別用
}

export interface TextConfig {
  size: number;
  angle: number;
  color: string; // Added: Individual color
  fontFamily: 'sans' | 'serif'; // Added: Individual font family
}

export interface ObiStyle {
  backgroundColor: string;
  // textColor removed (moved to TextConfig)
  heightPercent: number; // 20 to 50
  // fontFamily removed (moved to TextConfig)
  opacity: number;
  texture: boolean; // Paper texture effect
  bulgePosition: 'none' | 'left' | 'right'; // Side wrapping effect
  mainConfig: TextConfig;
  subConfig: TextConfig;
  catchphraseConfig: TextConfig;
}

export interface ObiContent {
  mainText: string;
  subText: string;
  catchphrase: string;
}

export type AppState = 'search' | 'edit' | 'download';
