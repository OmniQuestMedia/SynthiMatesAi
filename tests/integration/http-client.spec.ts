/**
 * http-client.spec.ts
 * CYR-CORE-001 — Integration tests for the shared HttpClient.
 * Covers: retry on 5xx, timeout, jitter (backoff is non-zero), 4xx no-retry,
 * AbortSignal cancellation, successful response passthrough.
 */

import { HttpClient } from '../../services/core-api/src/common/http-client';

// We stub globalThis.fetch to avoid real network calls.
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

function makeFetchStub(responses: Array<{ ok: boolean; status: number; body?: unknown }>) {
  let callCount = 0;
  return jest.fn().mockImplementation(() => {
    const resp = responses[Math.min(callCount, responses.length - 1)];
    callCount++;
    if (resp.ok) {
      return Promise.resolve({
        ok: true,
        status: resp.status,
        json: () => Promise.resolve(resp.body ?? {}),
        text: () => Promise.resolve(String(resp.body ?? '')),
      });
    }
    return Promise.resolve({
      ok: false,
      status: resp.status,
      json: () => Promise.reject(new Error('not json')),
      text: () => Promise.resolve(String(resp.body ?? 'error')),
    });
  });
}

describe('HttpClient', () => {
  describe('successful response', () => {
    it('returns parsed JSON on 2xx', async () => {
      const stub = makeFetchStub([{ ok: true, status: 200, body: { hello: 'world' } }]);
      globalThis.fetch = stub as unknown as typeof fetch;

      const client = new HttpClient({ provider: 'test', timeoutMs: 5000, maxRetries: 0 });
      const result = await client.request<{ hello: string }>('https://example.com/api');
      expect(result.data).toEqual({ hello: 'world' });
      expect(result.status).toBe(200);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(stub).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry on 5xx', () => {
    it('retries 5xx responses up to maxRetries and succeeds on final attempt', async () => {
      const stub = makeFetchStub([
        { ok: false, status: 503, body: 'service unavailable' },
        { ok: false, status: 503, body: 'service unavailable' },
        { ok: true, status: 200, body: { recovered: true } },
      ]);
      globalThis.fetch = stub as unknown as typeof fetch;

      const client = new HttpClient({
        provider: 'test',
        timeoutMs: 5000,
        maxRetries: 3,
        baseDelayMs: 1, // minimal delay for tests
      });
      const result = await client.request<{ recovered: boolean }>('https://example.com/api');
      expect(result.data.recovered).toBe(true);
      expect(stub).toHaveBeenCalledTimes(3);
    });

    it('throws after exhausting all retries', async () => {
      const stub = makeFetchStub([
        { ok: false, status: 502, body: 'bad gateway' },
        { ok: false, status: 502, body: 'bad gateway' },
        { ok: false, status: 502, body: 'bad gateway' },
        { ok: false, status: 502, body: 'bad gateway' },
      ]);
      globalThis.fetch = stub as unknown as typeof fetch;

      const client = new HttpClient({
        provider: 'test',
        timeoutMs: 5000,
        maxRetries: 3,
        baseDelayMs: 1,
      });
      await expect(client.request('https://example.com/api')).rejects.toThrow(/502/);
      expect(stub).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('4xx — no retry', () => {
    it('throws immediately on 4xx without retrying', async () => {
      const stub = makeFetchStub([{ ok: false, status: 400, body: 'bad request' }]);
      globalThis.fetch = stub as unknown as typeof fetch;

      const client = new HttpClient({ provider: 'test', timeoutMs: 5000, maxRetries: 3 });
      await expect(client.request('https://example.com/api')).rejects.toThrow(/400/);
      expect(stub).toHaveBeenCalledTimes(1); // no retry on 4xx
    });
  });

  describe('timeout', () => {
    it('aborts requests that exceed timeoutMs', async () => {
      // Stub fetch to return a promise that never resolves (simulates hang)
      globalThis.fetch = jest.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            // Listen for abort from the timeout controller
            if (init.signal) {
              (init.signal as AbortSignal).addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          }),
      ) as unknown as typeof fetch;

      const client = new HttpClient({
        provider: 'test',
        timeoutMs: 50, // 50ms timeout
        maxRetries: 0,
        baseDelayMs: 1,
      });

      await expect(client.request('https://example.com/api')).rejects.toThrow();
    }, 2000);
  });

  describe('AbortSignal passthrough', () => {
    it('rejects immediately when caller aborts before request completes', async () => {
      const abortController = new AbortController();

      globalThis.fetch = jest.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            if (init.signal) {
              (init.signal as AbortSignal).addEventListener('abort', () => {
                reject(new DOMException('Aborted by caller', 'AbortError'));
              });
            }
          }),
      ) as unknown as typeof fetch;

      // Abort after a short delay
      setTimeout(() => abortController.abort(), 20);

      const client = new HttpClient({ provider: 'test', timeoutMs: 5000, maxRetries: 0 });
      await expect(
        client.request('https://example.com/api', { signal: abortController.signal }),
      ).rejects.toThrow();
    }, 2000);
  });

  describe('jitter', () => {
    it('uses non-zero backoff between retries (verifiable via timing)', async () => {
      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      // Intercept setTimeout to record delay values (only ours, not others)
      jest
        .spyOn(globalThis, 'setTimeout')
        .mockImplementation((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (typeof delay === 'number' && delay > 0 && delay < 5000) {
            delays.push(delay);
          }
          return originalSetTimeout(fn as (...args: unknown[]) => void, delay, ...args);
        });

      const stub = makeFetchStub([
        { ok: false, status: 503 },
        { ok: true, status: 200, body: {} },
      ]);
      globalThis.fetch = stub as unknown as typeof fetch;

      const client = new HttpClient({
        provider: 'test',
        timeoutMs: 5000,
        maxRetries: 2,
        baseDelayMs: 100,
      });

      await client.request('https://example.com/api');

      jest.restoreAllMocks();

      // At least one retry delay should have been recorded
      const retryDelays = delays.filter((d) => d >= 50); // jitter may reduce below base
      expect(retryDelays.length).toBeGreaterThan(0);
    }, 5000);
  });
});
