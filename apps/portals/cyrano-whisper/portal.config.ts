// Portal: CYRANO_WHISPER — CyranoWhisper (Mainstream/non-adult)
// Per docs/PRODUCTS/SynthimateWhisper-Spec.md — Dates, acting, public speaking, language coaching
import type { PortalConfig } from '../portal.types';

export const portalConfig: PortalConfig = {
  id: 'CYRANO_WHISPER',
  name: 'CyranoWhisper',
  tagline: 'Your Whisper Coach for Every Conversation — Confidence in Your Ear',
  defaultCharacterPacks: [
    { name: 'Coach Marcus', persona: 'supportive_motivational' },
    { name: 'Professor Elena', persona: 'educational_warm' },
  ],
  ageGate: 18,
  theme: {
    primaryColor: '#1e3a8a', // Deep blue
    accentColor: '#3b82f6', // Bright blue
  },
  defaultRating: '14+',
  whisperFeatures: {
    virtualPickle: true,
    autoAdvance: true,
    broadcastOverlay: false, // Not for mainstream
    teleprompterMode: true,
  },
};
