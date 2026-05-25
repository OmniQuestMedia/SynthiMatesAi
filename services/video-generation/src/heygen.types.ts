// services/video-generation/src/heygen.types.ts
// CYR: HeyGen Video Generation Types
//
// Type definitions for HeyGen API integration

export type HeyGenTier = 'business' | 'enterprise';
export type VideoDuration = 8 | 16;

export interface GenerateTalkingVideoRequest {
  imageBuffer: Buffer;
  imageUrl?: string; // Alternative to buffer - can provide URL
  prompt: string;
  durationSeconds: VideoDuration;
  twinId: string;
  userId: string;
  creatorId: string;
  correlationId: string;
  tier?: HeyGenTier; // Optional, defaults to env config
}

export interface GenerateTalkingVideoResult {
  videoUrl: string;
  videoCacheId: string;
  durationSeconds: VideoDuration;
  tokensCharged: number;
  generatedAt: string;
  heygenVideoId?: string; // HeyGen's internal video ID
  fromCache: boolean;
}

export interface HeyGenApiResponse {
  video_id?: string;
  status?: string;
  video_url?: string;
  error?: string;
  message?: string;
}

// Token costs for video generation
export const VIDEO_COSTS: Record<VideoDuration, number> = {
  8: 60, // 8-second clips: 40-80 DreamCoins (using 60 as baseline)
  16: 125, // 16-second clips: 100-150 DreamCoins (using 125 as baseline)
};
