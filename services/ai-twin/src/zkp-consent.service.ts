import { Injectable } from '@nestjs/common';
import { CharacterReferenceService } from './character-reference.service';

@Injectable()
export class ZKPConsentService {
  constructor(private readonly characterReferenceService: CharacterReferenceService) {}

  async assertGenerationConsent(characterId: string): Promise<void> {
    await this.characterReferenceService.assertActiveConsent(
      characterId,
      'ZKP_CONSENT',
      'ZKP consent is required for synthetic generation for this character.',
    );
  }
}
