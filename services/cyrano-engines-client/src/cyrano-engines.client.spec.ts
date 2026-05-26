import { HttpClient } from '../../core-api/src/common/http-client';
import { CyranoEnginesClient } from './cyrano-engines.client';

describe('CyranoEnginesClient voice webhook contract', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends voice generation to the webhook endpoint with v1 event envelope', async () => {
    const requestSpy = jest.spyOn(HttpClient.prototype, 'request').mockResolvedValue({
      data: {
        audio_url: 'https://cdn.example.com/audio.mp3',
        generation_id: 'gen-1',
        cost_tokens: 12,
        duration_seconds: 3,
        correlation_id: 'corr-1',
      },
      status: 200,
      latencyMs: 12,
    });

    const client = new CyranoEnginesClient({
      baseUrl: 'https://api.cyranoengines.com',
      apiKey: 'test-key',
    });

    await client.generateVoice({
      text: 'Hello',
      voice_id: 'voice-1',
      user_id: 'user-1',
      personality_preset: 'GUIDE',
      personality_sliders: { warmth: 0.6 },
      fantasy_language_mode: { enabled: true, preserve_accent: true, base_locale: 'en-GB' },
      caption_translation: { enabled: true, target_locale: 'fr-FR' },
      target_locale: 'fr-FR',
      correlation_id: 'corr-1',
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const [url, options] = requestSpy.mock.calls[0] ?? [];
    expect(url).toBe('https://api.cyranoengines.com/api/v1/webhooks/voice/generate');
    expect(options).toBeDefined();
    const body = JSON.parse((options?.body as string) ?? '{}') as {
      event_name: string;
      event_version: string;
      payload: { target_locale?: string; personality_preset?: string };
    };
    expect(body.event_name).toBe('cyrano.voice.generate.v1');
    expect(body.event_version).toBe('v1');
    expect(body.payload.personality_preset).toBe('GUIDE');
    expect(body.payload.target_locale).toBe('fr-FR');
  });

  it('returns translated caption metadata from local fallback', async () => {
    const client = new CyranoEnginesClient({ baseUrl: '' });
    const response = await client.generateVoice({
      text: 'Hello',
      voice_id: 'voice-1',
      user_id: 'user-1',
      caption_translation: { enabled: true, target_locale: 'es-ES' },
    });
    expect(response.generation_id).toMatch(/^local-/);
    expect(response.caption_translation).toEqual({
      target_locale: 'es-ES',
      translated_caption: '[es-ES] Hello',
    });
  });
});
