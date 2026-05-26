import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 2.1 database foundation artifacts', () => {
  const migrationPath = join(
    __dirname,
    '..',
    '..',
    'prisma',
    'migrations',
    '20260526163000_phase_2_1_project_setup_database_foundation',
    'migration.sql',
  );

  const seedPath = join(__dirname, '..', '..', 'prisma', 'seed.ts');

  it('creates the required foundation tables and explicit integrity triggers', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('CREATE TABLE "facetdimensions"');
    expect(migration).toContain('CREATE TABLE "facetvalues"');
    expect(migration).toContain('CREATE TABLE "characters"');
    expect(migration).toContain('CREATE TABLE "characterfacets"');
    expect(migration).toContain('CREATE TABLE "characterexplicitfacets"');
    expect(migration).toContain('CREATE TABLE "engagementevents"');
    expect(migration).toContain('CREATE TABLE "popularityworkerstate"');
    expect(migration).toContain('characterfacets_enforce_nonexplicit_trigger');
    expect(migration).toContain('characterexplicitfacets_enforce_explicit_trigger');
  });

  it('seeds the required initial facet dimensions and explicit categories', () => {
    const seedSource = readFileSync(seedPath, 'utf8');

    expect(seedSource).toContain("'Cultural Aesthetics'");
    expect(seedSource).toContain("'Life Stage'");
    expect(seedSource).toContain("'Personality Vibe'");
    expect(seedSource).toContain("'Body Style'");
    expect(seedSource).toContain("'Explicit Category'");
    expect(seedSource).toContain("value: 'BDSM'");
    expect(seedSource).toContain("value: 'Roleplay'");
    expect(seedSource).toContain("value: 'Fetish'");
  });
});
