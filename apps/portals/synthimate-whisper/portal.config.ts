// Portal: SYNTHIMATE_WHISPER — SythiMateWhisper™ (Adult flagship)
// Per docs/PRODUCTS/SythiMateWhisper-Spec.md — Adult content creators, live broadcast
import type { PortalConfig } from '../portal.types';

export const portalConfig: PortalConfig = {
  id: 'SYNTHIMATE_WHISPER',
  name: 'SythiMateWhisper™',
  tagline: 'Your Whisper Companion for Adult Broadcasting — AI-Powered Confidence',
  defaultCharacterPacks: [
    { name: 'Scarlett Flame', persona: 'flirtatious_confident' },
    { name: 'Raven Night', persona: 'sultry_mysterious' },
  ],
  ageGate: 18,
  theme: {
    primaryColor: '#8b0000', // Dark red
    accentColor: '#ff1493', // Deep pink
  },
  defaultRating: 'XXX',
  whisperFeatures: {
    virtualPickle: true,
    autoAdvance: true,
    broadcastOverlay: true,
    teleprompterMode: true,
  },
};
