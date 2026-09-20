import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const client=read('apps/web/src/api/client.ts');
const page=read('apps/web/src/features/learning/CourseLearnerPage.tsx');
const router=read('apps/web/src/router/index.tsx');
const detail=read('apps/web/src/features/public-template/components/OwnerCourseDetail.tsx');
const workspace=read('apps/web/src/features/students/StudentWorkspacePage.tsx');
const auth=read('apps/web/src/features/public-template/PublicTemplateApp.tsx');
const intent=read('apps/web/src/features/students/postLoginIntent.ts');
const checks=[
 ['W5-0092-OWNER-CLIENT', ['enrollStudentCourse','getStudentCourseWorkspace','markStudentCourseLessonComplete','startStudentCourseQuiz','submitStudentCourseQuiz','completeStudentCourse'].every(k=>client.includes(k))],
 ['W5-0092-LEARNER-ROUTE', router.includes("path: 'student/courses/:courseId'") && router.includes('<CourseLearnerPage />')],
 ['W5-0092-WORKSPACE-HYDRATION', page.includes('getStudentCourseWorkspace(courseId)') && page.includes('workspace.curriculum.modules')],
 ['W5-0092-ENROLLMENT', page.includes('enrollStudentCourse(courseId)')],
 ['W5-0092-LESSON-PROGRESS', page.includes('markStudentCourseLessonComplete(courseId, lessonId)')],
 ['W5-0092-QUIZ', page.includes('startStudentCourseQuiz') && page.includes('submitStudentCourseQuiz')],
 ['W5-0092-COMPLETION', page.includes('completeStudentCourse(courseId)')],
 ['W5-0092-PUBLIC-HANDOFF', detail.includes('student/courses/${encodeURIComponent(course.ownerId)}') && detail.includes('ابدأ أو تابع التعلم')],
 ['W5-0092-EXTERNAL-STAYS-EXTERNAL', detail.includes('!isNative && course.directCourseUrl') && detail.includes('target="_blank"')],
 ['W5-0092-STUDENT-WORKSPACE-HANDOFF', workspace.includes('student/courses/${encodeURIComponent(course.courseId)}')],
 ['W5-0092-AUTH-INTENT', intent.includes('safeInternalPath') && page.includes('preservePostLoginReturn(returnPath)') && auth.includes('consumePostLoginReturn()')],
];
let passed=0; for(const [id,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${id}`); if(ok)passed++;}
console.log(`W5_0092_SOURCE=${passed===checks.length?'PASS':'FAIL'} ${passed}/${checks.length}`); process.exitCode=passed===checks.length?0:1;
