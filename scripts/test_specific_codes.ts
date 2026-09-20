import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { AdminMajorUseCases } from '../packages/application/src/majors/use-cases/AdminMajorUseCases.js';

async function run() {
  await registerDependencies();
  const adminMajorUseCases = container.resolve<AdminMajorUseCases>('adminMajorUseCases');
  
  const codes = ['DOC-0501', 'DOC-0600', 'DOC-0601', 'DOC-0700', 'DOC-0701', 'DOC-0800', 'DOC-0801', 'DOC-0900', 'DOC-0901', 'DOC-1000', 'DOC-1001', 'DOC-1100', 'DOC-1101', 'DOC-1114'];

  for (const code of codes) {
    const listResult = await adminMajorUseCases.listMajors({ classificationCode: code });
    if (listResult.data.length > 0) {
       const id = listResult.data[0].id;
       try {
           const sections = await adminMajorUseCases.listContentSections(id);
           const profiles = await adminMajorUseCases.listLevelProfiles(id);
           console.log(`${code} [${id}] - Sections: ${sections.length}, Profiles: ${profiles.length}`);
       } catch (e: any) {
           console.error(`${code} Error:`, e.message);
       }
    } else {
        console.log(`${code} - NOT FOUND IN LIST`);
    }
  }
}
run().catch(console.error);
