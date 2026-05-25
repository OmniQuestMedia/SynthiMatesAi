// services/video-generation/src/video.types.ts
// CYR: Video Generation Types

export interface GenerateVideoRequest {
  twin_id: string;
  creator_id: string;
  user_id: string;
  // Prompt for video generation
  prompt: string;
  // Video duration: 8s (default) or 16s (premium)
  duration_seconds: 8 | 16;
  // Resolution: 720p or 1080p (default)
  resolution?: '720p' | '1080p';
  // Fantasy level for synthetic image generation (0-1)
  fantasy_level?: number;
  // Correlation ID for tracking
  correlation_id?: string;
  // Idempotency key for token charging
  idempotency_key?: string;
}

export interface GenerateVideoResponse {
  video_cache_id: string;
  twin_id: string;
  storage_url: string;
  thumbnail_url?: string;
  prompt_used: string;
  duration_seconds: number;
  resolution: string;
  model: string;
  vidu_tier: 'premium' | 'enterprise';
  tokens_charged: number;
  generated_at_utc: string;
  from_cache: boolean;
  safeguards_metadata: {
    fantasyLevel: number;
    inputCount: number;
    safeguards: string[];
  };
}
