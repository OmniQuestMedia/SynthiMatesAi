// CYR: Personality Presets Configuration
// Phase 2.5 — Voice & Translation Features
//
// Defines personality presets for voice generation.
// Each preset maps to a specific set of voice slider values that create
// a distinct emotional tone and delivery style.

import type { VoiceSliders, PersonalityPreset } from './voice.types';

/**
 * Predefined personality presets for voice generation.
 * These presets provide a starting point that can be further customized
 * using voice_sliders in the TextToSpeechRequest.
 */
export const PERSONALITY_PRESETS: Record<PersonalityPreset, VoiceSliders> = {
  neutral: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    clarity: 0.75,
    energy: 0.5,
  },
  warm: {
    stability: 0.6,
    similarity_boost: 0.8,
    style: 0.4,
    clarity: 0.7,
    energy: 0.55,
  },
  professional: {
    stability: 0.75,
    similarity_boost: 0.8,
    style: 0.1,
    clarity: 0.9,
    energy: 0.5,
  },
  playful: {
    stability: 0.4,
    similarity_boost: 0.7,
    style: 0.7,
    clarity: 0.65,
    energy: 0.8,
  },
  intimate: {
    stability: 0.5,
    similarity_boost: 0.85,
    style: 0.6,
    clarity: 0.6,
    energy: 0.4,
  },
  commanding: {
    stability: 0.8,
    similarity_boost: 0.75,
    style: 0.2,
    clarity: 0.95,
    energy: 0.75,
  },
  soothing: {
    stability: 0.85,
    similarity_boost: 0.8,
    style: 0.3,
    clarity: 0.8,
    energy: 0.3,
  },
  energetic: {
    stability: 0.35,
    similarity_boost: 0.7,
    style: 0.75,
    clarity: 0.7,
    energy: 0.95,
  },
};

/**
 * Get voice sliders for a personality preset, optionally merged with custom overrides.
 * @param preset - The personality preset to use
 * @param overrides - Optional custom slider values that override preset defaults
 * @returns Combined voice sliders
 */
export function getPersonalitySliders(
  preset: PersonalityPreset,
  overrides?: Partial<VoiceSliders>,
): VoiceSliders {
  const baseSliders = PERSONALITY_PRESETS[preset];
  if (!baseSliders) {
    throw new Error(`Unknown personality preset: ${preset}`);
  }
  return { ...baseSliders, ...overrides };
}

/**
 * Apply legacy stability/similarity_boost/style values to voice sliders.
 * This ensures backward compatibility with older API calls.
 */
export function mergeLegacySliders(
  sliders: VoiceSliders,
  legacy: { stability?: number; similarity_boost?: number; style?: number },
): VoiceSliders {
  return {
    ...sliders,
    ...(legacy.stability !== undefined && { stability: legacy.stability }),
    ...(legacy.similarity_boost !== undefined && { similarity_boost: legacy.similarity_boost }),
    ...(legacy.style !== undefined && { style: legacy.style }),
  };
}
