// services/cyrano-engines-client/src/index.ts
// CYR: Phase 8 — CyranoEngines Client Exports (with OmniSync™ Suite + CyranoWhisper™)

export { CyranoEnginesClient } from './cyrano-engines.client';
export { CyranoEnginesModule } from './cyrano-engines.module';
export type {
  CyranoImageRequest,
  CyranoImageResponse,
  CyranoVoiceRequest,
  CyranoVoiceResponse,
  CyranoVideoRequest,
  CyranoVideoResponse,
  CyranoNarrativeRequest,
  CyranoNarrativeResponse,
  // OmniSync™ Suite types
  OmniSyncGateGuardRequest,
  OmniSyncGateGuardResponse,
  OmniSyncCrowdSyncRequest,
  OmniSyncCrowdSyncResponse,
  OmniSyncSenSyncRequest,
  OmniSyncSenSyncResponse,
  OmniSyncZoieRequest,
  OmniSyncZoieResponse,
  OmniSyncWelfareWatchRequest,
  OmniSyncWelfareWatchResponse,
  // CyranoWhisper™ types
  CyranoWhisperRequest,
  CyranoWhisperResponse,
  FallbackMetadata,
} from './cyrano-engines.client';
