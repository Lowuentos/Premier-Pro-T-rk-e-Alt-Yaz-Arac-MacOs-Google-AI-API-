export interface Subtitle {
  id: string;
  start: number; // in seconds
  end: number; // in seconds
  text: string;
}

export interface FormattingParams {
  maxWords: number;
  maxChars: number;
  gapSeconds: number; // space between consecutive subtitles
}

export interface ProjectStats {
  totalDuration: number;
  subtitleCount: number;
  averageWordsPerSub: number;
  averageCharsPerSub: number;
  readingSpeedAlerts: number; // subtitles with too high chars/sec
}

export interface DemoInterview {
  id: string;
  title: string;
  speaker: string;
  topic: string;
  audioUrl: string; // Standard audio asset or simulation fallback
  subtitles: Subtitle[];
}

export interface ArchivedProject {
  id: string;
  title: string;
  subtitles: Subtitle[];
  tokenUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    isDemo: boolean;
  };
  audioFileName?: string;
  createdAt: string;
}

