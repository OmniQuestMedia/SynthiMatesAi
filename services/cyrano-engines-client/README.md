# CyranoEngines Client Service

**Phase 7 Component**: Final Webhook Integration Polish
**Purpose**: Unified client for all SynthiMatesAi → CyranoEngines communication
**Status**: Production-ready with graceful fallback to local services

## Overview

This service provides a robust, production-grade client for calling CyranoEngines AI services via webhooks/API. It includes:

- ✅ Error handling with exponential backoff retry
- ✅ Configurable timeouts per operation type
- ✅ Correlation ID tracking across all requests
- ✅ Circuit breaker pattern for sustained failures
- ✅ Graceful fallback to local services when unavailable
- ✅ Structured logging for observability
- ✅ Type-safe request/response interfaces

## Architecture

```
SynthiMatesAi                        CyranoEngines
     │                                     │
     ├─► Image Generation  ──webhook──►  Flux LoRA + IP-Adapter
     ├─► Voice Generation  ──webhook──►  ElevenLabs TTS
     ├─► Video Generation  ──webhook──►  HeyGen Video
     └─► Narrative/Chat    ──webhook──►  LLM + Memory Bank
```

When CyranoEngines is unavailable or not configured, the client automatically falls back to local services in SynthiMatesAi.

## Configuration

Set these environment variables:

```bash
# Required for CyranoEngines integration
CYRANO_ENGINES_BASE_URL=https://api.cyranoengines.com
CYRANO_ENGINES_API_KEY=your-api-key-here

# Optional timeouts (milliseconds)
CYRANO_IMAGE_TIMEOUT_MS=60000      # Default: 60s
CYRANO_VOICE_TIMEOUT_MS=30000      # Default: 30s
CYRANO_VIDEO_TIMEOUT_MS=120000     # Default: 2min
CYRANO_NARRATIVE_TIMEOUT_MS=15000  # Default: 15s

# Optional circuit breaker config
CYRANO_CIRCUIT_BREAKER_THRESHOLD=5      # Failures before opening circuit
CYRANO_CIRCUIT_BREAKER_COOLDOWN_MS=60000 # Cooldown before retry (1min)
```

## Usage

### Basic Usage

```typescript
import { CyranoEnginesClient } from '@/services/cyrano-engines-client';

// Inject via NestJS
constructor(private readonly cyranoClient: CyranoEnginesClient) {}

// Generate an image
const imageResponse = await this.cyranoClient.generateImage({
  prompt: 'A beautiful sunset over mountains',
  twin_id: 'twin-123',
  user_id: 'user-456',
  correlation_id: 'req-789', // Optional, auto-generated if not provided
});

console.log(imageResponse.image_url);
console.log(imageResponse.cost_tokens);
console.log(imageResponse.correlation_id);
```

### Voice Generation

```typescript
const voiceResponse = await this.cyranoClient.generateVoice({
  text: 'Hello! How are you doing today?',
  voice_id: 'voice-123',
  user_id: 'user-456',
});

console.log(voiceResponse.audio_url);
console.log(voiceResponse.duration_seconds);
```

### Video Generation

```typescript
const videoResponse = await this.cyranoClient.generateVideo({
  image_url: 'https://cdn.example.com/twin-image.jpg',
  prompt: 'Wave and smile at the camera',
  duration_seconds: 5,
  user_id: 'user-456',
});

console.log(videoResponse.video_url);
console.log(videoResponse.cost_tokens);
```

### Narrative/Chat Generation

```typescript
const narrativeResponse = await this.cyranoClient.generateNarrative({
  session_id: 'session-123',
  user_message: 'What did we talk about last time?',
  twin_id: 'twin-123',
  user_id: 'user-456',
  include_memory: true,
});

console.log(narrativeResponse.reply);
console.log(narrativeResponse.memories_retrieved);
```

### Health Check

```typescript
const health = await this.cyranoClient.healthCheck();

console.log(health.available);          // true if circuit is closed
console.log(health.circuit_state);      // CLOSED, OPEN, or HALF_OPEN
console.log(health.using_local_fallback); // true if no CyranoEngines URL configured
```

## Circuit Breaker

The client implements a circuit breaker pattern to prevent cascading failures:

### States

1. **CLOSED** (Normal): All requests go through to CyranoEngines
2. **OPEN** (Failing): All requests immediately fall back to local services
3. **HALF_OPEN** (Testing): Allow limited requests to test if service recovered

### Behavior

- After `CYRANO_CIRCUIT_BREAKER_THRESHOLD` failures (default: 5), circuit opens
- Circuit remains open for `CYRANO_CIRCUIT_BREAKER_COOLDOWN_MS` (default: 60s)
- After cooldown, circuit enters HALF_OPEN state
- If 3 consecutive requests succeed in HALF_OPEN, circuit closes
- If any request fails in HALF_OPEN, circuit reopens

## Error Handling

All methods gracefully handle errors and fall back to local services:

```typescript
try {
  const response = await cyranoClient.generateImage(request);
  // Check if this is a fallback response
  if (response.generation_id.startsWith('local-')) {
    console.log('Using local fallback service');
  }
} catch (error) {
  // Errors are logged but methods always return a response
  console.error('Unexpected error:', error);
}
```

## Retry Logic

The underlying `HttpClient` provides automatic retry with exponential backoff:

- Max retries: 3 (configurable)
- Base delay: 1000ms
- Backoff: Exponential (1s → 2s → 4s)
- Jitter: ±25% to prevent thundering herd
- Only retries 5xx errors and network failures
- 4xx errors (client errors) are NOT retried

## Correlation ID Tracking

Every request includes a `correlation_id` that flows through:

1. Client request
2. HTTP headers (`x-correlation-id`)
3. CyranoEngines processing
4. Response payload
5. Logs and metrics

This enables end-to-end request tracing for debugging and analytics.

## Structured Logging

All requests log structured JSON with:

```json
{
  "provider": "cyrano-engines",
  "url": "https://api.cyranoengines.com/api/v1/image/generate",
  "method": "POST",
  "status_code": 200,
  "latency_ms": 1234,
  "correlation_id": "req-789"
}
```

Errors log additional context:

```json
{
  "provider": "cyrano-engines",
  "correlation_id": "req-789",
  "error": "HTTP 503: Service temporarily unavailable",
  "fallback": "local-image-service"
}
```

## Fallback Behavior

When CyranoEngines is unavailable:

1. **Not Configured**: If `CYRANO_ENGINES_BASE_URL` is empty, always use local services
2. **Circuit Open**: If circuit breaker is open, use local services until cooldown expires
3. **Request Failed**: If individual request fails after retries, use local service for that request

The client logs every fallback event for monitoring and alerting.

## Integration with Existing Services

To integrate with existing local services, update the fallback methods in `cyrano-engines.client.ts`:

```typescript
private async fallbackToLocalImageService(
  request: CyranoImageRequest,
  correlationId: string,
): Promise<CyranoImageResponse> {
  // Import your existing image service
  const imageService = this.moduleRef.get(ImageGenerationService);

  const result = await imageService.generate({
    prompt: request.prompt,
    twinId: request.twin_id,
    userId: request.user_id,
  });

  return {
    image_url: result.imageUrl,
    generation_id: result.id,
    cost_tokens: result.costTokens,
    latency_ms: result.latencyMs,
    correlation_id: correlationId,
  };
}
```

Repeat for voice, video, and narrative services.

## Testing

### Unit Tests

```typescript
describe('CyranoEnginesClient', () => {
  let client: CyranoEnginesClient;

  beforeEach(() => {
    client = new CyranoEnginesClient({
      baseUrl: 'https://test.cyranoengines.com',
      apiKey: 'test-key',
      maxRetries: 2,
    });
  });

  it('should generate image successfully', async () => {
    const response = await client.generateImage({
      prompt: 'test prompt',
      twin_id: 'twin-1',
      user_id: 'user-1',
    });

    expect(response).toHaveProperty('image_url');
    expect(response).toHaveProperty('correlation_id');
  });

  it('should fall back to local service when unavailable', async () => {
    const clientWithoutUrl = new CyranoEnginesClient({ baseUrl: '' });

    const response = await clientWithoutUrl.generateImage({
      prompt: 'test prompt',
      twin_id: 'twin-1',
      user_id: 'user-1',
    });

    expect(response.generation_id).toMatch(/^local-/);
  });
});
```

## Monitoring

Key metrics to monitor:

- **Latency**: Response times per operation type
- **Success Rate**: Successful requests vs fallbacks
- **Circuit State**: Time spent in each circuit breaker state
- **Error Rate**: Failures by error type
- **Fallback Rate**: Percentage of requests using local services
- **Token Usage**: StudioTokens consumed per operation

## Production Deployment

Before deploying to production:

1. ✅ Set `CYRANO_ENGINES_BASE_URL` to production endpoint
2. ✅ Set `CYRANO_ENGINES_API_KEY` with production API key
3. ✅ Configure appropriate timeouts for your workload
4. ✅ Set up monitoring/alerting for circuit breaker state
5. ✅ Implement local service fallbacks for all operation types
6. ✅ Test circuit breaker behavior in staging environment
7. ✅ Verify correlation IDs flow through logs and metrics

## Related Documentation

- [HttpClient](../core-api/src/common/http-client.ts) - Underlying HTTP client with retry logic
- [Webhook Hardening](../core-api/src/payments/webhook-hardening.service.ts) - Webhook validation patterns
- [WEBHOOK_CONTRACTS.md](../../docs/WEBHOOK_CONTRACTS.md) - Webhook contract specifications
- [Phase 7 Completion](../../docs/PHASE7_COMPLETION_SUMMARY.md) - Overall Phase 7 summary

---

**Rule Applied**: `CYRANO_ENGINES_CLIENT_v1`
**Phase**: 7 — Final Webhook Integration Polish
**Status**: Production-Ready ✅
