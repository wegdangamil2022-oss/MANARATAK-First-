import type { PublicInternationalTestDto } from '../../api/client';

/** Resolve the canonical owner ID through its public boundary, independent of catalog pages. */
export async function loadPublishedTestReference(
  identity: string,
  loadById: (id: string) => Promise<PublicInternationalTestDto>,
): Promise<PublicInternationalTestDto> {
  const id = identity.trim();
  if (!id || id.length > 160) throw new Error('PUBLISHED_TEST_REFERENCE_UNAVAILABLE');
  const test = await loadById(id);
  if (test.id !== id || test.status !== 'PUBLISHED' || test.isPubliclyVisible === false) {
    throw new Error('PUBLISHED_TEST_REFERENCE_UNAVAILABLE');
  }
  return test;
}
