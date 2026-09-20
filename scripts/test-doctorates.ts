import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { AdminMajorUseCases } from '../packages/application/src/majors/use-cases/AdminMajorUseCases.js';

async function run() {
  await registerDependencies();
  const adminMajorUseCases = container.resolve<AdminMajorUseCases>('adminMajorUseCases');

  const codes = ['DOC-0501', 'DOC-0600', 'DOC-0601', 'DOC-0700', 'DOC-0701', 'DOC-0800', 'DOC-0801', 'DOC-0900', 'DOC-0901', 'DOC-1000', 'DOC-1001', 'DOC-1100', 'DOC-1101', 'DOC-1114'];

  for (const code of codes) {
    try {
        console.log('Testing', code);
        const [major, profiles, sections, versions, sources] = await Promise.all([
            adminMajorUseCases.getMajor(code),
            adminMajorUseCases.getProfiles(code),
            adminMajorUseCases.getContentSections(code),
            adminMajorUseCases.getVersions(code),
            adminMajorUseCases.getSources(code)
        ]);
        console.log(`  - Major found: ${major ? 'YES' : 'NO'} (${major?.displayName})`);
        console.log(`  - Profiles: ${profiles.data.length}`);
        console.log(`  - Sections: ${sections.data.length}`);
        console.log(`  - Versions: ${versions.data.length}`);
        console.log(`  - Sources: ${sources.data.length}`);
    } catch (e: any) {
        console.log('  - Error fetching', code, e.message);
    }
  }
}

run().catch(console.error);
