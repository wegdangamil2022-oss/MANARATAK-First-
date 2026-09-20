import { MajorNamingService } from '../packages/domain/src/majors/majors.ts';
console.log("علم الاجتماع", MajorNamingService.normalizeSearchText("علم الاجتماع"));
console.log("علم اجتماع", MajorNamingService.normalizeSearchText("علم اجتماع"));
console.log("علم النفس", MajorNamingService.normalizeSearchText("علم النفس"));
console.log("علم نفس", MajorNamingService.normalizeSearchText("علم نفس"));
console.log("الخدمة الاجتماعية", MajorNamingService.normalizeSearchText("الخدمة الاجتماعية"));
console.log("خدمة اجتماعية", MajorNamingService.normalizeSearchText("خدمة اجتماعية"));
