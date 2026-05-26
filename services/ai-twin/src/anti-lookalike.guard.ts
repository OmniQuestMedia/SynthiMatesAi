import { Injectable } from '@nestjs/common';
import { CharacterReferenceService } from './character-reference.service';

@Injectable()
export class AntiLookalikeGuard {
  constructor(private readonly characterReferenceService: CharacterReferenceService) {}

  async assertLookalikeCheckConsent(characterId: string): Promise<void> {
    await this.characterReferenceService.assertActiveConsent(
      characterId,
      'ANTI_LOOKALIKE',
      'Anti-lookalike verification consent is required for this character.',
    );
  }
}
