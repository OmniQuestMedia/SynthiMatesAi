// services/cyrano-engines-client/src/cyrano-engines.client.ts
// CYR: Phase 7 — Unified CyranoEngines Webhook Client
//
// Purpose: Centralized client for all calls from SynthiMatesAi to CyranoEngines.
// Provides robust error handling, retry logic, timeout management, correlation_id
// tracking, and fallback mechanisms.
//
// Architecture: SynthiMatesAi → CyranoEngines (via webhooks/API)
// - Image generation (Flux LoRA + synthetic twins)
// - Voice cloning (ElevenLabs)
// - Video generation (HeyGen)
// - Narrative engine (LLM + memory)
//
// Design Principles:
// 1. All external AI engine calls go through this client
// 2. Consistent correlation_id tracking across all requests
// 3. Exponential backoff retry with jitter
// 4. Configurable timeouts per operation type
// 5. Fallback to degraded mode when engines unavailable
// 6. Structured logging for all requests/responses
// 7. Circuit breaker pattern for sustained failures

import { Injectable, Logger } from '@nestjs/common';
import { HttpClient } from '../../core-api/src/common/http-client';
import { v4 as uuid } from 'uuid';

// ── Configuration ──────────────────────────────────────────────────────────

interface CyranoEnginesConfig {
  baseUrl: string;
  apiKey: string;
  /** Timeout for image generation requests (ms). Default: 60000 (60s) */
  imageTimeoutMs?: number;
  /** Timeout for voice requests (ms). Default: 30000 (30s) */
  voiceTimeoutMs?: number;
  /** Timeout for video requests (ms). Default: 120000 (2min) */
  videoTimeoutMs?: number;
  /** Timeout for narrative/chat requests (ms). Default: 15000 (15s) */
  narrativeTimeoutMs?: number;
  /** Max retry attempts. Default: 3 */
  maxRetries?: number;
  /** Circuit breaker: failures before opening circuit. Default: 5 */
  circuitBreakerThreshold?: number;
  /** Circuit breaker: cooldown before retry (ms). Default: 60000 (1min) */
  circuitBreakerCooldownMs?: number;
}

// ── Request/Response Types ─────────────────────────────────────────────────

export interface CyranoImageRequest {
  prompt: string;
  twin_id: string;
  user_id: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  correlation_id?: string;
}

export interface CyranoImageResponse {
  image_url: string;
  generation_id: string;
  cost_tokens: number;
  latency_ms: number;
  correlation_id: string;
}

export interface CyranoVoiceRequest {
  text: string;
  voice_id: string;
  user_id: string;
  /** Predefined personality preset (neutral, warm, professional, etc.) */
  personality_preset?: string;
  /** Custom voice sliders - stability, similarity_boost, style, clarity, energy */
  voice_sliders?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    clarity?: number;
    energy?: number;
  };
  /** Fantasy Language Mode: preserve accent while translating */
  preserve_accent?: boolean;
  /** Source accent locale for Fantasy Language Mode */
  source_accent_locale?: string;
  /** Target locale for translation */
  personality_preset?: 'BALANCED' | 'INTIMATE' | 'GUIDE' | 'STORYTELLER';
  personality_sliders?: {
    warmth?: number;
    expressiveness?: number;
    playfulness?: number;
  };
  fantasy_language_mode?: {
    enabled: boolean;
    preserve_accent?: boolean;
    base_locale?: string;
  };
  caption_translation?: {
    enabled: boolean;
    target_locale?: string;
  };
  target_locale?: string;
  correlation_id?: string;
}

export interface CyranoVoiceResponse {
  audio_url: string;
  generation_id: string;
  cost_tokens: number;
  duration_seconds: number;
  locale?: string;
  caption_translation?: {
    target_locale: string;
    translated_caption: string;
  } | null;
  correlation_id: string;
}

export interface CyranoVideoRequest {
  image_url: string;
  prompt?: string;
  duration_seconds?: number;
  user_id: string;
  correlation_id?: string;
}

export interface CyranoVideoResponse {
  video_url: string;
  generation_id: string;
  cost_tokens: number;
  duration_seconds: number;
  correlation_id: string;
}

export interface CyranoNarrativeRequest {
  session_id: string;
  user_message: string;
  twin_id: string;
  user_id: string;
  include_memory?: boolean;
  correlation_id?: string;
}

export interface CyranoNarrativeResponse {
  reply: string;
  session_id: string;
  cost_tokens: number;
  memories_retrieved?: number;
  correlation_id: string;
}

// ── Circuit Breaker State ──────────────────────────────────────────────────

enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  successCount: number;
}

// ── Fallback Response Types ────────────────────────────────────────────────

export interface FallbackMetadata {
  is_fallback: true;
  reason: string;
  correlation_id: string;
}

// ── Main Client ────────────────────────────────────────────────────────────

@Injectable()
export class CyranoEnginesClient {
  private readonly logger = new Logger(CyranoEnginesClient.name);
  private readonly config: Required<CyranoEnginesConfig>;
  private readonly httpClient: HttpClient;
  private circuitBreaker: CircuitBreakerState;
  private static readonly VOICE_WEBHOOK_ENDPOINT = '/api/v1/webhooks/voice/generate';
  private static readonly VOICE_WEBHOOK_EVENT = 'cyrano.voice.generate.v1';

  constructor(config?: Partial<CyranoEnginesConfig>) {
    // Load from environment with defaults
    this.config = {
      baseUrl: config?.baseUrl ?? process.env.CYRANO_ENGINES_BASE_URL ?? '',
      apiKey: config?.apiKey ?? process.env.CYRANO_ENGINES_API_KEY ?? '',
      imageTimeoutMs: config?.imageTimeoutMs ?? 60_000,
      voiceTimeoutMs: config?.voiceTimeoutMs ?? 30_000,
      videoTimeoutMs: config?.videoTimeoutMs ?? 120_000,
      narrativeTimeoutMs: config?.narrativeTimeoutMs ?? 15_000,
      maxRetries: config?.maxRetries ?? 3,
      circuitBreakerThreshold: config?.circuitBreakerThreshold ?? 5,
      circuitBreakerCooldownMs: config?.circuitBreakerCooldownMs ?? 60_000,
    };

    // Initialize HTTP client with retry logic
    this.httpClient = new HttpClient({
      provider: 'cyrano-engines',
      timeoutMs: 30_000, // Default, overridden per request
      maxRetries: this.config.maxRetries,
      baseDelayMs: 1_000,
    });

    // Initialize circuit breaker
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailureTime: 0,
      successCount: 0,
    };

    this.logger.log('CyranoEnginesClient initialized', {
      base_url: this.config.baseUrl || '(not set - will use local services)',
      circuit_breaker_threshold: this.config.circuitBreakerThreshold,
    });
  }

  // ── Public API: Image Generation ─────────────────────────────────────────

  async generateImage(request: CyranoImageRequest): Promise<CyranoImageResponse> {
    const correlationId = request.correlation_id ?? uuid();

    // Check if CyranoEngines is configured
    if (!this.config.baseUrl) {
      return this.fallbackToLocalImageService(request, correlationId);
    }

    // Check circuit breaker
    if (!this.isCircuitClosed()) {
      return this.fallbackToLocalImageService(
        request,
        correlationId,
        'Circuit breaker OPEN - CyranoEngines unavailable',
      );
    }

    try {
      const response = await this.httpClient.request<CyranoImageResponse>(
        `${this.config.baseUrl}/api/v1/image/generate`,
        {
          method: 'POST',
          headers: this.buildHeaders(correlationId),
          body: JSON.stringify({ ...request, correlation_id: correlationId }),
        },
        correlationId,
      );

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      this.logger.error('CyranoEngines image generation failed, falling back to local service', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackToLocalImageService(request, correlationId, 'API call failed');
    }
  }

  // ── Public API: Voice Generation ─────────────────────────────────────────

  async generateVoice(request: CyranoVoiceRequest): Promise<CyranoVoiceResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackToLocalVoiceService(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackToLocalVoiceService(
        request,
        correlationId,
        'Circuit breaker OPEN - CyranoEngines unavailable',
      );
    }

    try {
      const response = await this.httpClient.request<CyranoVoiceResponse>(
        `${this.config.baseUrl}${CyranoEnginesClient.VOICE_WEBHOOK_ENDPOINT}`,
        {
          method: 'POST',
          headers: this.buildHeaders(correlationId),
          body: JSON.stringify({
            event_name: CyranoEnginesClient.VOICE_WEBHOOK_EVENT,
            event_version: 'v1',
            payload: { ...request, correlation_id: correlationId },
            correlation_id: correlationId,
          }),
        },
        correlationId,
      );

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      this.logger.error('CyranoEngines voice generation failed, falling back to local service', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackToLocalVoiceService(request, correlationId, 'API call failed');
    }
  }

  // ── Public API: Video Generation ─────────────────────────────────────────

  async generateVideo(request: CyranoVideoRequest): Promise<CyranoVideoResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackToLocalVideoService(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackToLocalVideoService(
        request,
        correlationId,
        'Circuit breaker OPEN - CyranoEngines unavailable',
      );
    }

    try {
      const response = await this.httpClient.request<CyranoVideoResponse>(
        `${this.config.baseUrl}/api/v1/video/generate`,
        {
          method: 'POST',
          headers: this.buildHeaders(correlationId),
          body: JSON.stringify({ ...request, correlation_id: correlationId }),
        },
        correlationId,
      );

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      this.logger.error('CyranoEngines video generation failed, falling back to local service', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackToLocalVideoService(request, correlationId, 'API call failed');
    }
  }

  // ── Public API: Narrative/Chat ───────────────────────────────────────────

  async generateNarrative(request: CyranoNarrativeRequest): Promise<CyranoNarrativeResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackToLocalNarrativeService(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackToLocalNarrativeService(
        request,
        correlationId,
        'Circuit breaker OPEN - CyranoEngines unavailable',
      );
    }

    try {
      const response = await this.httpClient.request<CyranoNarrativeResponse>(
        `${this.config.baseUrl}/api/v1/narrative/generate`,
        {
          method: 'POST',
          headers: this.buildHeaders(correlationId),
          body: JSON.stringify({ ...request, correlation_id: correlationId }),
        },
        correlationId,
      );

      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      this.logger.error(
        'CyranoEngines narrative generation failed, falling back to local service',
        {
          correlation_id: correlationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return this.fallbackToLocalNarrativeService(request, correlationId, 'API call failed');
    }
  }

  // ── Circuit Breaker Logic ────────────────────────────────────────────────

  private isCircuitClosed(): boolean {
    const now = Date.now();

    if (this.circuitBreaker.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.circuitBreaker.state === CircuitState.OPEN) {
      const timeSinceFailure = now - this.circuitBreaker.lastFailureTime;
      if (timeSinceFailure >= this.config.circuitBreakerCooldownMs) {
        this.logger.log('Circuit breaker entering HALF_OPEN state for retry');
        this.circuitBreaker.state = CircuitState.HALF_OPEN;
        this.circuitBreaker.successCount = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN state: allow requests through
    return true;
  }

  private recordSuccess(): void {
    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.successCount++;
      if (this.circuitBreaker.successCount >= 3) {
        this.logger.log('Circuit breaker recovered - entering CLOSED state');
        this.circuitBreaker.state = CircuitState.CLOSED;
        this.circuitBreaker.failures = 0;
      }
    } else if (this.circuitBreaker.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1);
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      this.logger.warn(
        `Circuit breaker OPEN after ${this.circuitBreaker.failures} failures - falling back to local services`,
      );
      this.circuitBreaker.state = CircuitState.OPEN;
    }
  }

  // ── Helper: Build Headers ─────────────────────────────────────────────────

  private buildHeaders(correlationId: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'x-correlation-id': correlationId,
      'x-source': 'synthimates',
      'x-rule-applied-id': 'CYRANO_ENGINES_CLIENT_v1',
    };
  }

  // ── Fallback: Local Services ─────────────────────────────────────────────
  // These methods provide graceful degradation to local services when
  // CyranoEngines is unavailable or not configured.

  private async fallbackToLocalImageService(
    request: CyranoImageRequest,
    correlationId: string,
    reason: string = 'CyranoEngines not configured',
  ): Promise<CyranoImageResponse> {
    this.logger.warn('Falling back to local image service', {
      correlation_id: correlationId,
      reason,
    });

    // TODO: Import and call local image-generation service
    // For now, return a placeholder that indicates fallback mode
    return {
      image_url: '/api/local/image/placeholder',
      generation_id: `local-${correlationId}`,
      cost_tokens: 50,
      latency_ms: 0,
      correlation_id: correlationId,
    };
  }

  private async fallbackToLocalVoiceService(
    request: CyranoVoiceRequest,
    correlationId: string,
    reason: string = 'CyranoEngines not configured',
  ): Promise<CyranoVoiceResponse> {
    this.logger.warn('Falling back to local voice service', {
      correlation_id: correlationId,
      reason,
    });

    // TODO: Import and call local voice-cloning service
    return {
      audio_url: '/api/local/voice/placeholder',
      generation_id: `local-${correlationId}`,
      cost_tokens: 30,
      duration_seconds: 5,
      locale: request.target_locale,
      caption_translation:
        request.caption_translation?.enabled && request.caption_translation.target_locale
          ? {
              target_locale: request.caption_translation.target_locale,
              translated_caption: `[${request.caption_translation.target_locale}] ${request.text}`,
            }
          : null,
      correlation_id: correlationId,
    };
  }

  private async fallbackToLocalVideoService(
    request: CyranoVideoRequest,
    correlationId: string,
    reason: string = 'CyranoEngines not configured',
  ): Promise<CyranoVideoResponse> {
    this.logger.warn('Falling back to local video service', {
      correlation_id: correlationId,
      reason,
    });

    // TODO: Import and call local video-generation service
    return {
      video_url: '/api/local/video/placeholder',
      generation_id: `local-${correlationId}`,
      cost_tokens: 80,
      duration_seconds: 5,
      correlation_id: correlationId,
    };
  }

  private async fallbackToLocalNarrativeService(
    request: CyranoNarrativeRequest,
    correlationId: string,
    reason: string = 'CyranoEngines not configured',
  ): Promise<CyranoNarrativeResponse> {
    this.logger.warn('Falling back to local narrative service', {
      correlation_id: correlationId,
      reason,
    });

    // TODO: Import and call local narrative-engine service
    return {
      reply: 'I apologize, but I am experiencing technical difficulties. Please try again shortly.',
      session_id: request.session_id,
      cost_tokens: 0,
      memories_retrieved: 0,
      correlation_id: correlationId,
    };
  }

  // ── Health Check ──────────────────────────────────────────────────────────

  async healthCheck(): Promise<{
    available: boolean;
    circuit_state: CircuitState;
    failures: number;
    using_local_fallback: boolean;
  }> {
    return {
      available: this.isCircuitClosed(),
      circuit_state: this.circuitBreaker.state,
      failures: this.circuitBreaker.failures,
      using_local_fallback: !this.config.baseUrl,
    };
  }
}
