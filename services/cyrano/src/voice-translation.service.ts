// CYR: Voice + Translation Integration Service
// Phase 2.5 — Voice & Translation Features
//
// Integrates voice generation with real-time translation for full
// voice + caption translation functionality. Supports Fantasy Language Mode
// where translation occurs but the original accent is preserved in voice output.

import { Injectable, Logger } from '@nestjs/common';
import { CyranoEnginesClient } from '../../cyrano-engines-client/src/cyrano-engines.client';
import {
  CyranoTranslationService,
  type Locale,
  TranslateInput,
} from './cyrano-translation.service';
import type {
  CyranoLayer4VoiceEnvelope,
  CyranoLayer4TranslationEnvelope,
} from './cyrano-layer4.types';
import { CyranoLayer4VoiceBridge } from './cyrano-layer4-voice.bridge';
import type { CyranoLayer4Tenant } from './cyrano-layer4.types';
import { randomUUID } from 'crypto';

export interface VoiceTranslationRequest {
  /** Text content to translate and/or speak */
  text: string;
  /** Source locale (defaults to en-US) */
  source_locale?: Locale;
  /** Target locale for translation */
  target_locale?: Locale;
  /** Voice ID for synthesis */
  voice_id?: string;
  /** Fantasy Language Mode: translate text but preserve source accent in voice */
  fantasy_language_mode?: boolean;
  /** Tenant information for audit and policy enforcement */
  tenant: CyranoLayer4Tenant;
  /** Correlation ID for request tracking */
  correlation_id?: string;
  /** Consent receipt ID for HIPAA/GDPR compliance */
  consent_receipt_id?: string;
}

export interface VoiceTranslationResponse {
  /** Original source text */
  source_text: string;
  /** Source locale */
  source_locale: Locale;
  /** Target locale (if translation was requested) */
  target_locale?: Locale;
  /** Translated text (empty if no translation requested) */
  translated_text: string;
  /** Voice synthesis envelope */
  voice?: CyranoLayer4VoiceEnvelope | null;
  /** Translation envelope */
  translation?: CyranoLayer4TranslationEnvelope | null;
  /** Whether Fantasy Language Mode was used */
  fantasy_mode_active: boolean;
  /** Correlation ID */
  correlation_id: string;
}

@Injectable()
export class VoiceTranslationService {
  private readonly logger = new Logger(VoiceTranslationService.name);

  constructor(
    private readonly translationService: CyranoTranslationService,
    private readonly voiceBridge: CyranoLayer4VoiceBridge,
    private readonly cyranoEnginesClient: CyranoEnginesClient,
  ) {}

  /**
   * Generate both voice and translated text for a given input.
   *
   * Workflow:
   * 1. If target_locale provided: translate text
   * 2. If voice synthesis requested: generate audio
   * 3. In Fantasy Language Mode: translate text but use original voice/accent
   *
   * @param request - Voice translation request parameters
   * @returns Combined voice and translation response
   */
  async process(request: VoiceTranslationRequest): Promise<VoiceTranslationResponse> {
    const correlationId = request.correlation_id || randomUUID();
    const sourceLocale = request.source_locale || 'en-US';
    const fantasyModeActive = request.fantasy_language_mode || false;

    this.logger.debug('VoiceTranslationService: processing request', {
      correlation_id: correlationId,
      source_locale: sourceLocale,
      target_locale: request.target_locale,
      fantasy_mode: fantasyModeActive,
      tenant_id: request.tenant.tenant_id,
    });

    let translationEnvelope: CyranoLayer4TranslationEnvelope | null = null;
    let translatedText = '';

    // Step 1: Translation (if target locale specified)
    if (request.target_locale && request.target_locale !== sourceLocale) {
      const translateInput: TranslateInput = {
        tenant_id: request.tenant.tenant_id,
        source_copy: request.text,
        target_locale: request.target_locale,
        correlation_id: correlationId,
        preserve_accent: fantasyModeActive,
        source_accent_locale: fantasyModeActive ? sourceLocale : undefined,
      };

      translationEnvelope = this.translationService.translate(translateInput);
      translatedText = translationEnvelope.translated_copy;

      this.logger.debug('VoiceTranslationService: translation complete', {
        correlation_id: correlationId,
        translated: !!translatedText,
        skipped: !!translationEnvelope.skipped_reason_code,
      });
    }

    // Step 2: Voice synthesis
    let voiceEnvelope: CyranoLayer4VoiceEnvelope | null = null;

    if (request.tenant.voice_enabled) {
      // In Fantasy Language Mode: speak translated text with original accent
      // In normal mode: speak in target language with target accent
      const textToSpeak = fantasyModeActive && translatedText ? translatedText : request.text;
      const voiceLocale = fantasyModeActive ? sourceLocale : request.target_locale || sourceLocale;

      voiceEnvelope = this.voiceBridge.synthesise({
        tenant: request.tenant,
        copy: textToSpeak,
        voice_id: request.voice_id,
        locale: voiceLocale,
        correlation_id: correlationId,
        consent_receipt_id: request.consent_receipt_id,
      });

      this.logger.debug('VoiceTranslationService: voice synthesis complete', {
        correlation_id: correlationId,
        voice_uri: voiceEnvelope.voice_uri,
        skipped: !!voiceEnvelope.skipped_reason_code,
        fantasy_mode: fantasyModeActive,
      });
    }

    return {
      source_text: request.text,
      source_locale: sourceLocale,
      target_locale: request.target_locale,
      translated_text: translatedText,
      voice: voiceEnvelope,
      translation: translationEnvelope,
      fantasy_mode_active: fantasyModeActive,
      correlation_id: correlationId,
    };
  }

  /**
   * Convenience method for voice-only generation (no translation).
   */
  async generateVoiceOnly(
    text: string,
    tenant: CyranoLayer4Tenant,
    voiceId?: string,
    locale?: Locale,
    correlationId?: string,
    consentReceiptId?: string,
  ): Promise<CyranoLayer4VoiceEnvelope> {
    return this.voiceBridge.synthesise({
      tenant,
      copy: text,
      voice_id: voiceId,
      locale,
      correlation_id: correlationId || randomUUID(),
      consent_receipt_id: consentReceiptId,
    });
  }

  /**
   * Convenience method for translation-only (no voice).
   */
  async translateOnly(
    text: string,
    tenantId: string,
    targetLocale: Locale,
    preserveAccent: boolean = false,
    sourceAccentLocale?: Locale,
    correlationId?: string,
  ): Promise<CyranoLayer4TranslationEnvelope> {
    return this.translationService.translate({
      tenant_id: tenantId,
      source_copy: text,
      target_locale: targetLocale,
      correlation_id: correlationId || randomUUID(),
      preserve_accent: preserveAccent,
      source_accent_locale: sourceAccentLocale,
    });
  }
}
