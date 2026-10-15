import type { StudentApplicationDocumentBindingDto } from './index';
export function studentDocumentAttestationState(
  binding: StudentApplicationDocumentBindingDto,
  cycleId: string | undefined,
  checksum: string | undefined,
  now = Date.now(),
): 'NOT_ATTESTED' | 'STALE' | 'VERIFIED' | 'REJECTED' {
  const a = binding.attestation;
  if (!a) return 'NOT_ATTESTED';
  const reviewed = Date.parse(a.reviewedAt),
    until = Date.parse(a.validUntil),
    consent = binding.reviewConsentGrantedAt?.getTime(),
    reviewUntil = binding.reviewConsentUntil?.getTime();
  if (
    !consent ||
    !reviewUntil ||
    !Number.isFinite(reviewed) ||
    reviewed < consent ||
    reviewed > now ||
    reviewed > reviewUntil ||
    !Number.isFinite(until) ||
    until <= now ||
    until > binding.retentionUntil.getTime() ||
    (binding.expiresAt && until > binding.expiresAt.getTime()) ||
    a.assetId !== binding.assetId ||
    a.ownerVersionId !== binding.ownerVersionId ||
    a.cycleId !== cycleId ||
    !checksum ||
    a.checksumSha256 !== checksum ||
    !a.reviewedBy ||
    !['VERIFIED', 'REJECTED'].includes(a.verdict)
  )
    return 'STALE';
  return a.verdict;
}
