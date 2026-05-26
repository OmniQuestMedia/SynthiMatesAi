import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';

export type CharacterConsentScope = 'CHARACTER_REFERENCE' | 'ANTI_LOOKALIKE' | 'ZKP_CONSENT';

@Injectable()
export class CharacterReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async hasActiveConsent(
    characterId: string,
    consentScope: CharacterConsentScope,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.$queryRaw<Array<{ has_consent: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM "character_consents"
        WHERE "character_id" = ${characterId}::uuid
          AND "consent_scope" = ${consentScope}
          AND "granted_at" <= ${now}
          AND ("revoked_at" IS NULL OR "revoked_at" > ${now})
      ) AS has_consent
    `;
    return Boolean(result[0]?.has_consent);
  }

  async assertActiveConsent(
    characterId: string,
    consentScope: CharacterConsentScope,
    errorMessage: string,
  ): Promise<void> {
    const hasConsent = await this.hasActiveConsent(characterId, consentScope);
    if (!hasConsent) {
      throw new ForbiddenException(errorMessage);
    }
  }
}
