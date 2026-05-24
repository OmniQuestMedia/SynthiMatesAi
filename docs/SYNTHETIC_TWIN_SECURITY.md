# Safe Synthetic Twin — Security & Compliance Checklist

## Legal + Ethical Guardrails

- **PIPEDA alignment (Canada):** only user-provided images are processed for the requested twin-generation purpose; no hidden secondary processing is permitted.
- **Right of publicity:** the pipeline is designed to prevent celebrity or public-figure impersonation through similarity weighting + refinement + dissimilarity gates.
- **Transformative safeguards:** output must remain synthetic/transformative, not a near-clone of any uploaded or public identity.

## Rate Limiting (Already Enforced)

- API throttles are already implemented with `@nestjs/throttler`:
  - `/cyrano/ai-twin` create/train/photo routes in `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/ai-twin/src/ai-twin.controller.ts`
  - `/api/ai-twin/test-synthetic` smoke endpoint in the same controller
- These limits reduce abuse risk and burst impersonation attempts.

## C2PA Watermarking + Provenance

- C2PA metadata is attached in `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/ai-twin/src/synthetic-pipeline.service.ts` (`addC2paMetadata`).
- When a generation service C2PA endpoint is available, provenance is attached upstream.
- If unavailable, a signed manifest payload is appended to the resulting URL as a fallback provenance token.

## Image Upload Validation

- Synthetic uploads are accepted only from multipart field `images`.
- Validation in `/home/runner/work/SynthiMatesAi/SynthiMatesAi/services/core-api/src/cyrano/ai-twin-synthetic.controller.ts` enforces:
  - Minimum **5** input images
  - Maximum **20** files per request
  - Maximum **10 MB** per file
  - `image/*` MIME-type requirement
  - Buffer validation before processing

## User Consent Disclaimer (Required UI/API Language)

Use this consent text in the twin-creation UX and API-facing legal copy:

> I confirm I have the legal right to use all uploaded images, consent to transformative synthetic generation, and will not attempt impersonation, rights infringement, or deceptive identity cloning.

## Operational Checklist

- Curator admin trigger path documented: `/admin/ai-twin/curator/trigger`
- Rate limiting documented and enabled
- C2PA provenance metadata documented and enabled in pipeline
- No backdoors, magic bypasses, or undocumented overrides permitted
