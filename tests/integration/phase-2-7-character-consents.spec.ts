import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 2.7 character consent artifacts', () => {
  const migrationPath = join(
    __dirname,
    '..',
    '..',
    'prisma',
    'migrations',
    '20260526191500_add_character_consents',
    'migration.sql',
  );

  const seedPath = join(__dirname, '..', '..', 'prisma', 'seed.ts');

  it('creates character_consents table with scope uniqueness and character FK', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "character_consents"');
    expect(migration).toContain('"consent_scope"  VARCHAR(80)  NOT NULL');
    expect(migration).toContain('"character_consents_character_id_consent_scope_key"');
    expect(migration).toContain('"character_consents_character_id_fkey"');
  });

  it('seeds baseline character consent scopes required by guardrail services', () => {
    const seedSource = readFileSync(seedPath, 'utf8');

    expect(seedSource).toContain('PHASE_2_7_CHARACTER_ID');
    expect(seedSource).toContain("scope: 'CHARACTER_REFERENCE'");
    expect(seedSource).toContain("scope: 'ANTI_LOOKALIKE'");
    expect(seedSource).toContain("scope: 'ZKP_CONSENT'");
    expect(seedSource).toContain('INSERT INTO "character_consents"');
  });
});
