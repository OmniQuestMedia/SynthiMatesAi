/**
 * circuit-breaker.spec.ts
 * CYR-CORE-001 — Integration tests for the CircuitBreaker state machine.
 * Covers: CLOSED → OPEN transition, OPEN rejection, HALF_OPEN probe,
 * success recovery (HALF_OPEN → CLOSED), failure re-trip (HALF_OPEN → OPEN).
 */

import { CircuitBreaker } from '../../services/core-api/src/common/circuit-breaker';

function makeBreaker(failureThreshold = 3, resetTimeoutMs = 100) {
  return new CircuitBreaker({ provider: 'test', failureThreshold, resetTimeoutMs });
}

async function failN(breaker: CircuitBreaker, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    try {
      await breaker.execute(() => Promise.reject(new Error('provider down')));
    } catch {
      // expected
    }
  }
}

describe('CircuitBreaker', () => {
  describe('CLOSED state', () => {
    it('starts in CLOSED state', () => {
      const breaker = makeBreaker();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('passes through successful calls', async () => {
      const breaker = makeBreaker();
      const result = await breaker.execute(() => Promise.resolve(42));
      expect(result).toBe(42);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('remains CLOSED below failure threshold', async () => {
      const breaker = makeBreaker(5);
      await failN(breaker, 4); // one below threshold
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('CLOSED → OPEN transition', () => {
    it('trips OPEN when consecutive failures reach the threshold', async () => {
      const breaker = makeBreaker(3);
      await failN(breaker, 3);
      expect(breaker.getState()).toBe('OPEN');
    });

    it('resets failure count on success (stays CLOSED)', async () => {
      const breaker = makeBreaker(3);
      await failN(breaker, 2);
      await breaker.execute(() => Promise.resolve('ok')); // resets counter
      await failN(breaker, 2);
      expect(breaker.getState()).toBe('CLOSED'); // counter reset, only 2 new failures
    });
  });

  describe('OPEN state', () => {
    it('rejects calls immediately with CIRCUIT_OPEN code', async () => {
      const breaker = makeBreaker(3);
      await failN(breaker, 3);

      expect.assertions(2);
      try {
        await breaker.execute(() => Promise.resolve('should not be called'));
      } catch (err) {
        expect((err as Error).message).toMatch(/OPEN/i);
        expect((err as Error & { code: string }).code).toBe('CIRCUIT_OPEN');
      }
    });

    it('does not call the wrapped function when OPEN', async () => {
      const breaker = makeBreaker(2);
      await failN(breaker, 2);

      const spy = jest.fn().mockResolvedValue('x');
      try {
        await breaker.execute(spy);
      } catch {
        // expected
      }
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('OPEN → HALF_OPEN transition', () => {
    it('moves to HALF_OPEN after resetTimeoutMs elapses', async () => {
      const breaker = makeBreaker(2, 50); // 50ms reset
      await failN(breaker, 2);
      expect(breaker.getState()).toBe('OPEN');

      await new Promise((r) => setTimeout(r, 60)); // wait for reset
      expect(breaker.getState()).toBe('HALF_OPEN');
    });
  });

  describe('HALF_OPEN probe', () => {
    it('moves back to CLOSED on probe success', async () => {
      const breaker = makeBreaker(2, 50);
      await failN(breaker, 2);
      await new Promise((r) => setTimeout(r, 60));

      expect(breaker.getState()).toBe('HALF_OPEN');
      await breaker.execute(() => Promise.resolve('recovered'));
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('trips back to OPEN on probe failure', async () => {
      const breaker = makeBreaker(2, 50);
      await failN(breaker, 2);
      await new Promise((r) => setTimeout(r, 60));

      expect(breaker.getState()).toBe('HALF_OPEN');
      try {
        await breaker.execute(() => Promise.reject(new Error('still down')));
      } catch {
        // expected
      }
      expect(breaker.getState()).toBe('OPEN');
    });
  });
});
