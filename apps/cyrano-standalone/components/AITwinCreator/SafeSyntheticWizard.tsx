// apps/cyrano-standalone/components/AITwinCreator/SafeSyntheticWizard.tsx
// Safe Synthetic Twin creation wizard (4 steps: upload → settings → generating → complete).

'use client';

import React, { useState, useCallback } from 'react';

type WizardStep = 'upload' | 'settings' | 'generating' | 'complete';

interface SyntheticResult {
  imageUrl: string;
  metadata: {
    fantasyLevel: number;
    inputCount: number;
    safeguards: string[];
  };
}

export function SafeSyntheticWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [fantasyLevel, setFantasyLevel] = useState(0.25);
  const [consentGiven, setConsentGiven] = useState(false);
  const [result, setResult] = useState<SyntheticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected.filter((f) => f.type.startsWith('image/')));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!consentGiven) {
      setError('Please confirm consent before generating.');
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

      const res = await fetch('/api/cyrano/ai-twin/synthetic', {
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

  const STEPS: WizardStep[] = ['upload', 'settings', 'generating', 'complete'];

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
            I confirm consent for all uploaded images.
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            {step === 'upload' && (
              <button type="button" onClick={() => setStep('settings')}>
                Continue
              </button>
            )}
            <button type="button" onClick={handleGenerate}>
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
        </div>
      )}
    </div>
  );
}

export default SafeSyntheticWizard;
