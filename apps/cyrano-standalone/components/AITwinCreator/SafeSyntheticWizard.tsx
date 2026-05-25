// apps/cyrano-standalone/components/AITwinCreator/SafeSyntheticWizard.tsx
// Safe Synthetic Twin creation wizard (4 steps: upload → settings → generating → complete).
// Enhanced with video generation capability (Vidu Reference-to-Video hybrid integration)

'use client';

import React, { useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_CYRANO_API_URL ?? 'http://localhost:3000';

type WizardStep = 'upload' | 'settings' | 'generating' | 'complete';

interface SyntheticResult {
  imageUrl: string;
  metadata: {
    fantasyLevel: number;
    inputCount: number;
    safeguards: string[];
  };
}

interface VideoResult {
  url: string;
  cacheId: string;
  syntheticImageUrl: string;
  durationSeconds: number;
  captureId: string;
}

export function SafeSyntheticWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [fantasyLevel, setFantasyLevel] = useState(0.25);
  const [consentGiven, setConsentGiven] = useState(false);
  const [result, setResult] = useState<SyntheticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Video generation state
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState<8 | 16>(8);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected.filter((f) => f.type.startsWith('image/')));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!consentGiven) {
      setError('Please acknowledge the Safe Synthetic disclaimer before generating.');
      return;
    }
    if (files.length < 5) {
      setError('Please upload at least 5 images.');
      return;
    }

    setError(null);
    setStep('generating');

    try {
      const form = new FormData();
      files.forEach((f) => form.append('images', f));
      form.append('fantasyLevel', String(fantasyLevel));

      const res = await fetch(`${API_BASE}/cyrano/ai-twin/synthetic`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? `Server error ${res.status}`);
      }

      const data = (await res.json()) as SyntheticResult;
      setResult(data);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('settings');
    }
  }, [files, fantasyLevel, consentGiven]);

  const handleGenerateVideo = useCallback(async () => {
    if (!videoPrompt.trim()) {
      setVideoError('Please enter a prompt for the video generation.');
      return;
    }

    setVideoError(null);
    setGeneratingVideo(true);

    try {
      // Call the backend video generation endpoint
      // Backend expects: twin_id, creator_id, user_id, prompt, duration_seconds, resolution, fantasy_level
      const res = await fetch(`${API_BASE}/cyrano/videos/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twin_id: 'demo-twin-id', // TODO: Get from twin context
          creator_id: 'demo-creator-id', // TODO: Get from creator context
          user_id: 'demo-user-id', // TODO: Get from auth context
          prompt: videoPrompt,
          duration_seconds: videoDuration,
          resolution: '1080p',
          fantasy_level: fantasyLevel,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? `Server error ${res.status}`);
      }

      // Backend returns GenerateVideoResponse type
      const data = (await res.json()) as {
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
      };

      setVideoResult({
        url: data.storage_url,
        cacheId: data.video_cache_id,
        syntheticImageUrl: result?.imageUrl ?? '',
        durationSeconds: data.duration_seconds,
        captureId: data.video_cache_id, // Using cache ID as capture ID for now
      });
      setShowVideoOptions(false);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setGeneratingVideo(false);
    }
  }, [result, fantasyLevel, videoPrompt, videoDuration]);

  const STEPS: WizardStep[] = ['upload', 'settings', 'generating', 'complete'];

  const videoCost = videoDuration === 8 ? '60' : '120';

  return (
    <div
      style={{ maxWidth: 720, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}
    >
      <h2>Safe Synthetic Twin Wizard</h2>
      <p>
        Step: {step} ({STEPS.indexOf(step) + 1}/{STEPS.length})
      </p>

      {error && (
        <div
          style={{
            border: '1px solid #c00',
            background: '#fee',
            color: '#900',
            padding: 12,
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      {(step === 'upload' || step === 'settings') && (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <label>
            Upload images (minimum 5)
            <input type="file" multiple accept="image/*" onChange={handleFileChange} />
          </label>
          <div>{files.length} images selected</div>

          <label>
            Fantasy level: {fantasyLevel.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={fantasyLevel}
              onChange={(e) => setFantasyLevel(parseFloat(e.target.value))}
            />
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
            />
            By uploading these images I confirm they are my own or consented, and I understand the
            system applies transformative safeguards (multi-image blending, celebrity
            down-weighting, dissimilarity gate, C2PA watermark).
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            {step === 'upload' && (
              <button type="button" onClick={() => setStep('settings')}>
                Continue
              </button>
            )}
            <button type="button" onClick={handleGenerate} disabled={!consentGiven}>
              Generate Safe Synthetic Twin
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div style={{ marginTop: 16 }}>
          <p>Generating your synthetic twin... Please wait.</p>
        </div>
      )}

      {step === 'complete' && result && (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <p>Generation complete.</p>
          <img
            src={result.imageUrl}
            alt="Safe Synthetic Twin result"
            style={{ maxWidth: '100%', borderRadius: 8 }}
          />
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
            {JSON.stringify(result.metadata, null, 2)}
          </pre>

          {/* Video Generation Section */}
          <div style={{ marginTop: 24, borderTop: '2px solid #eee', paddingTop: 24 }}>
            <h3>🎬 Generate Reference-to-Video (Vidu)</h3>
            <p style={{ color: '#666', fontSize: 14 }}>
              Create an animated video using your synthetic twin image and Vidu Reference-to-Video.
            </p>

            {!showVideoOptions && !videoResult && (
              <button
                type="button"
                onClick={() => setShowVideoOptions(true)}
                style={{
                  padding: '12px 24px',
                  background: '#1a1a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Generate Video
              </button>
            )}

            {showVideoOptions && !videoResult && (
              <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                <label>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Video Prompt</div>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Enter the text for your twin to speak..."
                    rows={3}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </label>

                <label>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Duration: {videoDuration} seconds ({videoCost} DreamCoins)
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="radio"
                        checked={videoDuration === 8}
                        onChange={() => setVideoDuration(8)}
                      />
                      8 seconds (60 DreamCoins)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="radio"
                        checked={videoDuration === 16}
                        onChange={() => setVideoDuration(16)}
                      />
                      16 seconds (120 DreamCoins)
                    </label>
                  </div>
                </label>

                {videoError && (
                  <div
                    style={{
                      border: '1px solid #c00',
                      background: '#fee',
                      color: '#900',
                      padding: 12,
                      borderRadius: 6,
                    }}
                  >
                    {videoError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleGenerateVideo}
                    disabled={generatingVideo || !videoPrompt.trim()}
                    style={{
                      padding: '12px 24px',
                      background: generatingVideo ? '#ccc' : '#1a1a2e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: generatingVideo ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {generatingVideo ? 'Generating...' : `Generate Video (${videoCost} DreamCoins)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVideoOptions(false)}
                    disabled={generatingVideo}
                    style={{
                      padding: '12px 24px',
                      background: '#fff',
                      color: '#1a1a2e',
                      border: '1px solid #ccc',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {videoResult && (
              <div style={{ marginTop: 16, background: '#f8f8f8', padding: 16, borderRadius: 8 }}>
                <h4 style={{ marginTop: 0 }}>✅ Video Generated Successfully!</h4>
                <video src={videoResult.url} controls style={{ maxWidth: '100%', borderRadius: 8 }}>
                  Your browser does not support the video tag.
                </video>
                <div style={{ marginTop: 12, fontSize: 14, color: '#666' }}>
                  <div>Duration: {videoResult.durationSeconds} seconds</div>
                  <div>Capture ID: {videoResult.captureId} (saved for training)</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVideoResult(null);
                    setShowVideoOptions(true);
                    setVideoPrompt('');
                  }}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    background: '#fff',
                    color: '#1a1a2e',
                    border: '1px solid #ccc',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Generate Another Video
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SafeSyntheticWizard;
