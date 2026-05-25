// services/cyrano/src/whisper-auto-advance.service.ts
// CYR: Intelligent Auto-Advance logic for Whisper mode
// Listens for speech pauses and delivers next chunk automatically

export interface AutoAdvanceConfig {
  enabled: boolean;
  confidenceThreshold: number; // 0-100
  pauseDurationMs: number; // Silence duration to trigger advance
  maxWaitMs: number; // Max time to wait before force-advancing
}

export interface AutoAdvanceFrame {
  sessionId: string;
  isListening: boolean;
  silenceDurationMs: number;
  confidence: number;
  nextLineReady: boolean;
  timestamp: string;
}

export class WhisperAutoAdvanceService {
  private defaultConfig: AutoAdvanceConfig = {
    enabled: true,
    confidenceThreshold: 70,
    pauseDurationMs: 1500, // 1.5 seconds of silence
    maxWaitMs: 8000, // 8 seconds max
  };

  /**
   * Evaluates whether to auto-advance to the next whisper based on speech patterns.
   * Returns true if conditions are met for automatic advancement.
   */
  shouldAutoAdvance(frame: AutoAdvanceFrame, config: Partial<AutoAdvanceConfig> = {}): boolean {
    const mergedConfig = { ...this.defaultConfig, ...config };

    if (!mergedConfig.enabled || !frame.nextLineReady) {
      return false;
    }

    // Auto-advance if:
    // 1. Confidence is above threshold
    // 2. Silence duration exceeds configured pause duration
    // 3. OR max wait time exceeded (force advance)
    const confidenceMet = frame.confidence >= mergedConfig.confidenceThreshold;
    const pauseMet = frame.silenceDurationMs >= mergedConfig.pauseDurationMs;
    const maxWaitExceeded = frame.silenceDurationMs >= mergedConfig.maxWaitMs;

    return (confidenceMet && pauseMet) || maxWaitExceeded;
  }

  /**
   * Computes confidence score based on audio analysis.
   * Placeholder for actual audio processing logic.
   */
  computeConfidence(_audioFrame: ArrayBuffer): number {
    // TODO: Implement actual audio analysis
    // For now, return a placeholder confidence score
    return Math.floor(Math.random() * 40) + 60; // 60-100 range
  }
}
