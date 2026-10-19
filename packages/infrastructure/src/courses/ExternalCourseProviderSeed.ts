import type { IExternalCourseProviderRepository, UpsertExternalCourseProviderSeedInput } from '@manaratak/domain';
export const EXTERNAL_COURSE_PROVIDER_SEED: readonly UpsertExternalCourseProviderSeedInput[] = [];
export async function seedExternalCourseProviders(repository: IExternalCourseProviderRepository) { return Promise.all(EXTERNAL_COURSE_PROVIDER_SEED.map((definition) => repository.upsertSeedProvider(definition))); }
