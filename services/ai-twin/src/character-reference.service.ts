import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../core-api/src/prisma.service';

export type CharacterConsentScope = 'CHARACTER_REFERENCE' | 'ANTI_LOOKALIKE' | 'ZKP_CONSENT';

@Injectable()
export class CharacterReferenceService {
  private static readonly UUID_V4_OR_V1_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(private readonly prisma: PrismaService) {}

  async hasActiveConsent(
    characterId: string,
    consentScope: CharacterConsentScope,
  ): Promise<boolean> {
    if (!CharacterReferenceService.UUID_V4_OR_V1_REGEX.test(characterId)) {
      throw new BadRequestException('characterId must be a valid UUID.');
    }

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
