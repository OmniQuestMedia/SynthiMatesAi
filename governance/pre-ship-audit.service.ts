// WO: WO-029
// P0.7: Extended with OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md invariant checks
//       (rule_applied_id: OQMI_INFRA_v1.0)
import { ForensicHasher } from '../finance/forensic-hasher.service';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '../..');

function readSafe(path: string): string {
  try {
    return readFileSync(join(REPO_ROOT, path), 'utf8');
  } catch {
    return '';
  }
}

/** OQMI_INFRA_v1.0 §3 — Canada-only data residency */
function checkCanadaResidency(): { pass: boolean; evidence: string } {
  const compose = readSafe('docker-compose.yml');
  // Approved regions: AWS ca-central-1, Azure canadacentral / canada-central, OVH/ThinkOn/eStruxture Canada
  const hasCanadaRegion =
    /ca-central-1|canadacentral|canada-central|canada-east|OVH Canada|ThinkOn|eStruxture/i.test(
      compose,
    );
  // Fail if a non-Canadian AWS region is pinned as the primary region
  const hasProhibitedRegion = /us-east-[12]|us-west-[12]|eu-west|ap-southeast/.test(compose);
  if (hasProhibitedRegion) {
    return {
      pass: false,
      evidence: 'Prohibited non-Canadian region detected in docker-compose.yml',
    };
  }
  return {
    pass: true,
    evidence: hasCanadaRegion
      ? 'Canadian region reference confirmed'
      : 'No explicit region in compose — verify production IaC separately',
  };
}

/** OQMI_INFRA_v1.0 §5 — Immutable 3-2-1 backup requirement documented */
function checkImmutableBackupPolicy(): { pass: boolean; evidence: string } {
  const policyPath = 'governance/OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md';
  const policy = readSafe(policyPath);
  const hasBdrPolicy =
    policy.includes('3-2-1') && policy.includes('WORM') && policy.includes('immutable');
  return {
    pass: hasBdrPolicy,
    evidence: hasBdrPolicy
      ? 'OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md contains 3-2-1 + WORM + immutable backup policy'
      : `${policyPath} missing or does not contain required backup invariants`,
  };
}

/** OQMI_INFRA_v1.0 §2 — AI advisory-only boundary */
function checkAiAdvisoryBoundary(): { pass: boolean; evidence: string } {
  const policy = readSafe('governance/OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md');
  const hasAdvisoryBoundary =
    policy.includes('advisory infrastructure only') || policy.includes('AI advisory-only');
  return {
    pass: hasAdvisoryBoundary,
    evidence: hasAdvisoryBoundary
      ? 'AI advisory-only boundary codified in OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md'
      : 'AI advisory boundary clause missing from policy document',
  };
}

export class PreShipAuditService {
  public static runFinalCertification(data: unknown[]): boolean {
    const stateHash = ForensicHasher.generateStateHash(data);
    console.log(`[OQMI_CERT]: System State Hash: ${stateHash}`);

    // OQMI_INFRA_v1.0 invariant checks
    const canadaCheck = checkCanadaResidency();
    console.log(
      `[OQMI_INFRA_v1.0][INFRA-1] Canada residency: ${canadaCheck.pass ? 'PASS' : 'FAIL'} — ${canadaCheck.evidence}`,
    );

    const backupCheck = checkImmutableBackupPolicy();
    console.log(
      `[OQMI_INFRA_v1.0][INFRA-2] Immutable backup policy: ${backupCheck.pass ? 'PASS' : 'FAIL'} — ${backupCheck.evidence}`,
    );

    const aiCheck = checkAiAdvisoryBoundary();
    console.log(
      `[OQMI_INFRA_v1.0][INFRA-3] AI advisory boundary: ${aiCheck.pass ? 'PASS' : 'FAIL'} — ${aiCheck.evidence}`,
    );

    const infraPass = canadaCheck.pass && backupCheck.pass && aiCheck.pass;
    if (!infraPass) {
      console.error(
        '[OQMI_CERT]: INFRA_SECURITY_VIOLATION — one or more OQMI_INFRA_v1.0 invariants failed',
      );
    }

    return infraPass;
  }

  /** Verify the sovereign policy file is present and non-empty. */
  public static verifyPolicyFilePresent(): boolean {
    const policyPath = join(REPO_ROOT, 'governance/OQMI_INFRASTRUCTURE_AND_SECURITY_POLICY.md');
    return existsSync(policyPath) && readFileSync(policyPath, 'utf8').length > 0;
  }
}
