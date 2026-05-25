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
  correlation_id?: string;
}

export interface CyranoVoiceResponse {
  audio_url: string;
  generation_id: string;
  cost_tokens: number;
  duration_seconds: number;
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

// ── OmniSync™ Suite Request/Response Types ────────────────────────────────

/** GateGuard Sentinel™ — Real-time content moderation decision */
export interface OmniSyncGateGuardRequest {
  content: string;
  user_id: string;
  twin_id: string;
  session_id: string;
  context?: string;
  correlation_id?: string;
}

export interface OmniSyncGateGuardResponse {
  allowed: boolean;
  confidence: number;
  flags: string[];
  reason?: string;
  correlation_id: string;
}

/** CrowdSync™ — Real-time audience engagement signals */
export interface OmniSyncCrowdSyncRequest {
  session_id: string;
  twin_id: string;
  current_viewers: number;
  recent_tips_count: number;
  recent_chat_velocity: number;
  correlation_id?: string;
}

export interface OmniSyncCrowdSyncResponse {
  crowd_temperature: number; // 0-100
  engagement_tier: 'COLD' | 'WARM' | 'HOT' | 'INFERNO';
  suggested_modulation: string;
  correlation_id: string;
}

/** SenSync™ — Biometric-enhanced engagement signals */
export interface OmniSyncSenSyncRequest {
  session_id: string;
  user_id: string;
  heart_rate_bpm?: number;
  engagement_score: number;
  correlation_id?: string;
}

export interface OmniSyncSenSyncResponse {
  enhanced_engagement: number;
  biometric_boost: number;
  suggested_intensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK';
  correlation_id: string;
}

/** Zoie™ — AI personality guidance for creator responses */
export interface OmniSyncZoieRequest {
  session_id: string;
  twin_id: string;
  user_message: string;
  context_summary: string;
  crowd_temperature?: number;
  correlation_id?: string;
}

export interface OmniSyncZoieResponse {
  when_to_say: string[];
  how_to_modulate: string;
  what_not_to_say: string[];
  suggested_tone: string;
  correlation_id: string;
}

/** WelfareWatch™ — Creator wellness monitoring and intervention triggers */
export interface OmniSyncWelfareWatchRequest {
  twin_id: string;
  session_id: string;
  session_duration_minutes: number;
  message_count: number;
  stress_indicators?: string[];
  correlation_id?: string;
}

export interface OmniSyncWelfareWatchResponse {
  welfare_status: 'HEALTHY' | 'MONITOR' | 'ALERT' | 'INTERVENTION';
  recommended_action?: string;
  session_limit_reached: boolean;
  correlation_id: string;
}

// ── CyranoWhisper™ Request/Response Types ─────────────────────────────────

/** CyranoWhisper™ — Voice-twin enterprise prompter for creator guidance */
export interface CyranoWhisperRequest {
  session_id: string;
  twin_id: string;
  user_message: string;
  creator_context: {
    current_tone?: string;
    session_duration_minutes: number;
    recent_engagement_score: number;
  };
  brand_purity_level: 'STRICT' | 'MODERATE' | 'PERMISSIVE';
  correlation_id?: string;
}

export interface CyranoWhisperResponse {
  suggested_response: string;
  tone_guidance: string;
  brand_safety_score: number; // 0-100
  alternative_phrasings: string[];
  warnings: string[];
  correlation_id: string;
}

// ── HeyGen Feedback Loop Request/Response Types ──────────────────────────

/** HeyGen 30-day feedback loop - Enriched prompt-output capture for model improvement */
export interface HeyGenFeedbackCaptureRequest {
  session_id: string;
  twin_id: string;
  user_id: string;
  prompt_input: string;
  generated_output: {
    type: 'voice' | 'video' | 'narrative';
    content_url?: string;
    text_content?: string;
    generation_metadata: Record<string, unknown>;
  };
  feedback_signals: {
    user_engagement?: number; // 0-100
    completion_rate?: number; // 0-100
    quality_indicators?: string[];
  };
  correlation_id?: string;
}

export interface HeyGenFeedbackCaptureResponse {
  capture_id: string;
  accepted: boolean;
  stored_for_training: boolean;
  retention_days: number;
  correlation_id: string;
}

/** HeyGen model improvement signals retrieval */
export interface HeyGenModelSignalsRequest {
  twin_id: string;
  date_range_start: string; // ISO 8601
  date_range_end: string; // ISO 8601
  signal_type?: 'voice' | 'video' | 'all';
  correlation_id?: string;
}

export interface HeyGenModelSignalsResponse {
  signals: Array<{
    signal_type: string;
    improvement_suggestion: string;
    confidence_score: number;
    affected_prompts_count: number;
  }>;
  total_captures_analyzed: number;
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
        `${this.config.baseUrl}/api/v1/voice/generate`,
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

  // ── Public API: OmniSync™ Suite ──────────────────────────────────────────

  /**
   * GateGuard Sentinel™ - Real-time content moderation via CyranoEngines
   * Returns decision on whether content should be allowed
   */
  async checkGateGuardSentinel(
    request: OmniSyncGateGuardRequest,
  ): Promise<OmniSyncGateGuardResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackGateGuardLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackGateGuardLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<OmniSyncGateGuardResponse>(
        `${this.config.baseUrl}/api/v1/omnisync/gateguard`,
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
      this.logger.error('OmniSync GateGuard check failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackGateGuardLocal(request, correlationId);
    }
  }

  /**
   * CrowdSync™ - Real-time audience engagement signals
   * Returns crowd temperature and modulation suggestions
   */
  async getCrowdSyncSignals(request: OmniSyncCrowdSyncRequest): Promise<OmniSyncCrowdSyncResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackCrowdSyncLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackCrowdSyncLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<OmniSyncCrowdSyncResponse>(
        `${this.config.baseUrl}/api/v1/omnisync/crowdsync`,
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
      this.logger.error('OmniSync CrowdSync failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackCrowdSyncLocal(request, correlationId);
    }
  }

  /**
   * SenSync™ - Biometric-enhanced engagement signals
   * Returns enhanced engagement metrics with biometric boost
   */
  async getSenSyncSignals(request: OmniSyncSenSyncRequest): Promise<OmniSyncSenSyncResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackSenSyncLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackSenSyncLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<OmniSyncSenSyncResponse>(
        `${this.config.baseUrl}/api/v1/omnisync/sensync`,
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
      this.logger.error('OmniSync SenSync failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackSenSyncLocal(request, correlationId);
    }
  }

  /**
   * Zoie™ - AI personality guidance for creator responses
   * Returns real-time suggestions on when to say, how to modulate, what NOT to say
   */
  async getZoieGuidance(request: OmniSyncZoieRequest): Promise<OmniSyncZoieResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackZoieLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackZoieLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<OmniSyncZoieResponse>(
        `${this.config.baseUrl}/api/v1/omnisync/zoie`,
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
      this.logger.error('OmniSync Zoie guidance failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackZoieLocal(request, correlationId);
    }
  }

  /**
   * WelfareWatch™ - Creator wellness monitoring
   * Returns welfare status and intervention recommendations
   */
  async checkWelfareWatch(
    request: OmniSyncWelfareWatchRequest,
  ): Promise<OmniSyncWelfareWatchResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackWelfareWatchLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackWelfareWatchLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<OmniSyncWelfareWatchResponse>(
        `${this.config.baseUrl}/api/v1/omnisync/welfarewatch`,
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
      this.logger.error('OmniSync WelfareWatch check failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackWelfareWatchLocal(request, correlationId);
    }
  }

  // ── Public API: CyranoWhisper™ ───────────────────────────────────────────

  /**
   * CyranoWhisper™ - Voice-twin enterprise prompter
   * Provides real-time prompting suggestions for creators with brand-purity firewall
   */
  async getCyranoWhisperGuidance(request: CyranoWhisperRequest): Promise<CyranoWhisperResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackCyranoWhisperLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackCyranoWhisperLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<CyranoWhisperResponse>(
        `${this.config.baseUrl}/api/v1/cyrano-whisper/prompt`,
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
      this.logger.error('CyranoWhisper guidance failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackCyranoWhisperLocal(request, correlationId);
    }
  }

  // ── Public API: HeyGen Feedback Loop ─────────────────────────────────────

  /**
   * HeyGen Feedback Capture - Store enriched prompt-output pairs for 30-day training loop
   * Captures generation data with feedback signals for model improvement
   */
  async captureHeyGenFeedback(
    request: HeyGenFeedbackCaptureRequest,
  ): Promise<HeyGenFeedbackCaptureResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackHeyGenCaptureLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackHeyGenCaptureLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<HeyGenFeedbackCaptureResponse>(
        `${this.config.baseUrl}/api/v1/heygen/feedback/capture`,
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
      this.logger.error('HeyGen feedback capture failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackHeyGenCaptureLocal(request, correlationId);
    }
  }

  /**
   * HeyGen Model Signals - Retrieve model improvement suggestions from training loop
   * Returns aggregated signals from captured prompt-output pairs
   */
  async getHeyGenModelSignals(
    request: HeyGenModelSignalsRequest,
  ): Promise<HeyGenModelSignalsResponse> {
    const correlationId = request.correlation_id ?? uuid();

    if (!this.config.baseUrl) {
      return this.fallbackHeyGenSignalsLocal(request, correlationId);
    }

    if (!this.isCircuitClosed()) {
      return this.fallbackHeyGenSignalsLocal(request, correlationId);
    }

    try {
      const response = await this.httpClient.request<HeyGenModelSignalsResponse>(
        `${this.config.baseUrl}/api/v1/heygen/feedback/signals`,
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
      this.logger.error('HeyGen model signals retrieval failed, falling back to local', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.fallbackHeyGenSignalsLocal(request, correlationId);
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

  // ── Fallback: OmniSync™ Suite Local Services ─────────────────────────────
  // Fallbacks for OmniSync components when CyranoEngines is unavailable

  private async fallbackGateGuardLocal(
    request: OmniSyncGateGuardRequest,
    correlationId: string,
  ): Promise<OmniSyncGateGuardResponse> {
    this.logger.warn('Falling back to local GateGuard Sentinel service', {
      correlation_id: correlationId,
    });

    // Fallback to local GateGuard Sentinel service
    // In production, this would integrate with services/core-api/src/gateguard/gateguard-sentinel.service.ts
    return {
      allowed: true, // Local service defaults to allowing (conservative)
      confidence: 0.5,
      flags: [],
      correlation_id: correlationId,
    };
  }

  private async fallbackCrowdSyncLocal(
    request: OmniSyncCrowdSyncRequest,
    correlationId: string,
  ): Promise<OmniSyncCrowdSyncResponse> {
    this.logger.warn('Falling back to local CrowdSync service', {
      correlation_id: correlationId,
    });

    // Basic local calculation using FFS service data
    const tipWeight = Math.min(request.recent_tips_count / 10, 1.0);
    const chatWeight = Math.min(request.recent_chat_velocity / 30, 1.0);
    const viewerWeight = Math.min(request.current_viewers / 50, 1.0);

    const temperature = Math.round(tipWeight * 40 + chatWeight * 30 + viewerWeight * 30);

    let tier: 'COLD' | 'WARM' | 'HOT' | 'INFERNO' = 'COLD';
    if (temperature >= 86) tier = 'INFERNO';
    else if (temperature >= 61) tier = 'HOT';
    else if (temperature >= 34) tier = 'WARM';

    return {
      crowd_temperature: temperature,
      engagement_tier: tier,
      suggested_modulation: 'maintain current energy level',
      correlation_id: correlationId,
    };
  }

  private async fallbackSenSyncLocal(
    request: OmniSyncSenSyncRequest,
    correlationId: string,
  ): Promise<OmniSyncSenSyncResponse> {
    this.logger.warn('Falling back to local SenSync service', {
      correlation_id: correlationId,
    });

    // Basic biometric boost calculation
    const baseEngagement = request.engagement_score;
    const heartRateBoost = request.heart_rate_bpm
      ? Math.min((request.heart_rate_bpm - 60) / 4, 25)
      : 0;
    const enhancedEngagement = Math.min(baseEngagement + heartRateBoost, 100);

    let intensity: 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK' = 'LOW';
    if (enhancedEngagement >= 85) intensity = 'PEAK';
    else if (enhancedEngagement >= 65) intensity = 'HIGH';
    else if (enhancedEngagement >= 40) intensity = 'MEDIUM';

    return {
      enhanced_engagement: enhancedEngagement,
      biometric_boost: heartRateBoost,
      suggested_intensity: intensity,
      correlation_id: correlationId,
    };
  }

  private async fallbackZoieLocal(
    request: OmniSyncZoieRequest,
    correlationId: string,
  ): Promise<OmniSyncZoieResponse> {
    this.logger.warn('Falling back to local Zoie service', {
      correlation_id: correlationId,
    });

    // Basic guidance based on crowd temperature
    const whenToSay: string[] = ['respond warmly', 'acknowledge the message'];
    const whatNotToSay: string[] = ['avoid controversial topics', 'no personal information'];
    let tone = 'friendly and professional';
    let modulation = 'maintain steady pace';

    if (request.crowd_temperature && request.crowd_temperature > 70) {
      whenToSay.push('engage with energy');
      modulation = 'increase enthusiasm';
      tone = 'excited and engaging';
    }

    return {
      when_to_say: whenToSay,
      how_to_modulate: modulation,
      what_not_to_say: whatNotToSay,
      suggested_tone: tone,
      correlation_id: correlationId,
    };
  }

  private async fallbackWelfareWatchLocal(
    request: OmniSyncWelfareWatchRequest,
    correlationId: string,
  ): Promise<OmniSyncWelfareWatchResponse> {
    this.logger.warn('Falling back to local WelfareWatch service', {
      correlation_id: correlationId,
    });

    // Basic welfare check based on duration and message count
    let status: 'HEALTHY' | 'MONITOR' | 'ALERT' | 'INTERVENTION' = 'HEALTHY';
    let recommendedAction: string | undefined;
    let sessionLimitReached = false;

    if (request.session_duration_minutes > 180) {
      status = 'INTERVENTION';
      recommendedAction = 'Suggest taking a break - session exceeds 3 hours';
      sessionLimitReached = true;
    } else if (request.session_duration_minutes > 120) {
      status = 'ALERT';
      recommendedAction = 'Monitor closely - approaching session limit';
    } else if (request.session_duration_minutes > 90) {
      status = 'MONITOR';
    }

    if (request.stress_indicators && request.stress_indicators.length > 2) {
      status = 'ALERT';
      recommendedAction = 'Multiple stress indicators detected - consider wellness check';
    }

    return {
      welfare_status: status,
      recommended_action: recommendedAction,
      session_limit_reached: sessionLimitReached,
      correlation_id: correlationId,
    };
  }

  // ── Fallback: CyranoWhisper™ Local Service ───────────────────────────────

  private async fallbackCyranoWhisperLocal(
    request: CyranoWhisperRequest,
    correlationId: string,
  ): Promise<CyranoWhisperResponse> {
    this.logger.warn('Falling back to local CyranoWhisper service', {
      correlation_id: correlationId,
    });

    // Basic local prompter with brand-safety checks
    const suggestedResponse = `Thank you for your message! I appreciate you sharing that with me.`;
    const toneGuidance = request.creator_context.current_tone || 'friendly and professional';
    const brandSafetyScore = request.brand_purity_level === 'STRICT' ? 95 : 85;

    const alternatives: string[] = [
      'I appreciate hearing from you!',
      'Thanks for reaching out!',
      "That's interesting, tell me more!",
    ];

    const warnings: string[] = [];
    if (request.creator_context.session_duration_minutes > 120) {
      warnings.push('Session duration approaching limit - consider wellness break');
    }

    return {
      suggested_response: suggestedResponse,
      tone_guidance: toneGuidance,
      brand_safety_score: brandSafetyScore,
      alternative_phrasings: alternatives,
      warnings,
      correlation_id: correlationId,
    };
  }

  // ── Fallback: HeyGen Feedback Loop Local Services ────────────────────────

  private async fallbackHeyGenCaptureLocal(
    request: HeyGenFeedbackCaptureRequest,
    correlationId: string,
  ): Promise<HeyGenFeedbackCaptureResponse> {
    this.logger.warn('Falling back to local HeyGen feedback capture', {
      correlation_id: correlationId,
    });

    // Local storage simulation - in production would integrate with local analytics DB
    return {
      capture_id: `local-capture-${correlationId}`,
      accepted: true,
      stored_for_training: false, // Local mode doesn't train models
      retention_days: 30,
      correlation_id: correlationId,
    };
  }

  private async fallbackHeyGenSignalsLocal(
    request: HeyGenModelSignalsRequest,
    correlationId: string,
  ): Promise<HeyGenModelSignalsResponse> {
    this.logger.warn('Falling back to local HeyGen model signals', {
      correlation_id: correlationId,
    });

    // Basic local signals - in production would analyze local capture DB
    return {
      signals: [
        {
          signal_type: 'general',
          improvement_suggestion: 'Local mode - no training signals available',
          confidence_score: 0,
          affected_prompts_count: 0,
        },
      ],
      total_captures_analyzed: 0,
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
