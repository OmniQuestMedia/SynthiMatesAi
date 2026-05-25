// services/cyrano/src/whisper-prompt.service.ts
// CYR: Whisper-specific prompt generation extending base Cyrano service
// Handles both consumer (SythiMateWhisper™) and enterprise (CyranoWhisper) modes

import type { CyranoCategory, CyranoDomain } from './cyrano.types';

export type WhisperMode = 'CONSUMER_ADULT' | 'CONSUMER_MAINSTREAM' | 'ENTERPRISE';

export interface WhisperPromptRequest {
  sessionId: string;
  creatorId: string;
  guestId?: string; // Optional for enterprise mode
  mode: WhisperMode;
  domain: CyranoDomain;
  context: {
    recentMessages?: string[];
    personaId?: string;
    rating: 'G' | '14+' | '18+' | 'XXX';
  };
}

export interface WhisperPromptResponse {
  promptId: string;
  category: CyranoCategory;
  whisperText: string;
  priority: number;
  rating: 'G' | '14+' | '18+' | 'XXX';
  domain: CyranoDomain;
  mode: WhisperMode;
  generatedAt: string;
}

export class WhisperPromptService {
  /**
   * Generates whisper prompts based on mode and domain.
   * Filters suggestions based on rating and domain appropriateness.
   */
  async generateWhisperPrompt(request: WhisperPromptRequest): Promise<WhisperPromptResponse> {
    const { mode, domain, context } = request;

    // Filter categories based on mode and rating
    const allowedCategories = this.getAllowedCategories(mode, context.rating);

    // Select category (simplified - would use actual Cyrano engine logic)
    const category = this.selectCategory(allowedCategories, domain);

    // Generate whisper text
    const whisperText = await this.generateWhisperText(category, domain, context.rating);

    return {
      promptId: `whisper-${Date.now()}`,
      category,
      whisperText,
      priority: this.calculatePriority(category, mode),
      rating: context.rating,
      domain,
      mode,
      generatedAt: new Date().toISOString(),
    };
  }

  private getAllowedCategories(
    mode: WhisperMode,
    rating: 'G' | '14+' | '18+' | 'XXX',
  ): CyranoCategory[] {
    const baseCats: CyranoCategory[] = [
      'CAT_SESSION_OPEN',
      'CAT_ENGAGEMENT',
      'CAT_NARRATIVE',
      'CAT_SESSION_CLOSE',
    ];

    // Add monetization/escalation for adult modes
    if (mode === 'CONSUMER_ADULT' && (rating === '18+' || rating === 'XXX')) {
      baseCats.push('CAT_ESCALATION', 'CAT_MONETIZATION');
    }

    // Always include recovery and callback
    baseCats.push('CAT_RECOVERY', 'CAT_CALLBACK');

    return baseCats;
  }

  private selectCategory(allowed: CyranoCategory[], _domain: CyranoDomain): CyranoCategory {
    // Simplified selection - actual implementation would use Cyrano engine logic
    return allowed[Math.floor(Math.random() * allowed.length)];
  }

  private async generateWhisperText(
    category: CyranoCategory,
    domain: CyranoDomain,
    _rating: 'G' | '14+' | '18+' | 'XXX',
  ): Promise<string> {
    // Placeholder - actual implementation would call Cyrano template engine
    const templates: Record<CyranoDomain, Record<CyranoCategory, string>> = {
      ADULT_ENTERTAINMENT: {
        CAT_SESSION_OPEN: 'Welcome them with a sultry greeting',
        CAT_ENGAGEMENT: 'Ask about their fantasies',
        CAT_ESCALATION: 'Suggest a private show',
        CAT_NARRATIVE: "Tell them what you're wearing",
        CAT_CALLBACK: 'Reference their previous visit',
        CAT_RECOVERY: 'Re-engage with a playful tease',
        CAT_MONETIZATION: 'Mention your tip menu',
        CAT_SESSION_CLOSE: 'Thank them and hint at next time',
      },
      TEACHING: {
        CAT_SESSION_OPEN: 'Start with an engaging question',
        CAT_ENGAGEMENT: 'Check for understanding',
        CAT_ESCALATION: 'Challenge with a harder question',
        CAT_NARRATIVE: 'Explain the concept clearly',
        CAT_CALLBACK: 'Reference previous lesson',
        CAT_RECOVERY: 'Clarify the confusing part',
        CAT_MONETIZATION: 'Mention premium tutoring',
        CAT_SESSION_CLOSE: 'Summarize key takeaways',
      },
      COACHING: {
        CAT_SESSION_OPEN: "Ask how they're feeling",
        CAT_ENGAGEMENT: 'Encourage them to share more',
        CAT_ESCALATION: 'Challenge their limiting belief',
        CAT_NARRATIVE: 'Share a relevant insight',
        CAT_CALLBACK: 'Reference their goal',
        CAT_RECOVERY: 'Offer reassurance',
        CAT_MONETIZATION: 'Mention coaching packages',
        CAT_SESSION_CLOSE: 'Set action items',
      },
      FIRST_RESPONDER: {
        CAT_SESSION_OPEN: 'Assess the situation calmly',
        CAT_ENGAGEMENT: 'Gather critical information',
        CAT_ESCALATION: 'Request backup if needed',
        CAT_NARRATIVE: 'Explain the next steps',
        CAT_CALLBACK: 'Reference protocol',
        CAT_RECOVERY: 'De-escalate tension',
        CAT_MONETIZATION: 'N/A',
        CAT_SESSION_CLOSE: 'Confirm all clear',
      },
      FACTORY_SAFETY: {
        CAT_SESSION_OPEN: 'Begin safety briefing',
        CAT_ENGAGEMENT: 'Check equipment status',
        CAT_ESCALATION: 'Report safety violation',
        CAT_NARRATIVE: 'Explain procedure',
        CAT_CALLBACK: 'Reference safety manual',
        CAT_RECOVERY: 'Correct unsafe practice',
        CAT_MONETIZATION: 'N/A',
        CAT_SESSION_CLOSE: 'Confirm shift handoff',
      },
      MEDICAL: {
        CAT_SESSION_OPEN: 'Greet patient warmly',
        CAT_ENGAGEMENT: 'Ask about symptoms',
        CAT_ESCALATION: 'Call for specialist',
        CAT_NARRATIVE: 'Explain diagnosis',
        CAT_CALLBACK: 'Reference medical history',
        CAT_RECOVERY: 'Reassure patient',
        CAT_MONETIZATION: 'N/A',
        CAT_SESSION_CLOSE: 'Provide care instructions',
      },
    };

    return templates[domain][category] || 'Continue the conversation naturally';
  }

  private calculatePriority(category: CyranoCategory, mode: WhisperMode): number {
    // Higher priority for certain categories in certain modes
    const priorities: Record<CyranoCategory, number> = {
      CAT_SESSION_OPEN: 90,
      CAT_ENGAGEMENT: 70,
      CAT_ESCALATION: 60,
      CAT_NARRATIVE: 50,
      CAT_CALLBACK: 80,
      CAT_RECOVERY: 85,
      CAT_MONETIZATION: mode === 'CONSUMER_ADULT' ? 65 : 40,
      CAT_SESSION_CLOSE: 75,
    };

    return priorities[category] || 50;
  }
}
