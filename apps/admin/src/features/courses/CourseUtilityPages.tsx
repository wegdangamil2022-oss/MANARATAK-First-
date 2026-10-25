import { Link } from 'react-router-dom';
import { ArrowLeft, Route, WalletCards } from 'lucide-react';
import { CourseLearningPathsWorkspace } from '../../components/CourseLearningPathsWorkspace';
import { useCourseCopy } from './useCourseCopy';
import './courses.css';

export function CoursePaidPreparationPage() {
  const { ar, tr } = useCourseCopy();
  return <main className="courses-workspace" dir={ar ? 'rtl' : 'ltr'}><section className="course-hero"><span><WalletCards size={18}/>{tr('قيد التجهيز', 'In preparation')}</span><h1>{tr('إدارة الدورات المدفوعة', 'Paid course management')}</h1><p>{tr('واجهة تمهيدية. ستُبرمج وظائف هذا المسار بعد اعتماد قواعده التجارية.', 'Preparation page. Operations will be implemented after the commercial rules are approved.')}</p></section><section className="course-panel course-preparation"><WalletCards size={36}/><h2>{tr('التشغيل مؤجل', 'Operations deferred')}</h2><p>{tr('لا توجد هنا عمليات شراء أو تسعير أو إنشاء مدفوعات. تبقى سياسات الإتاحة المالية للدورات الحالية في مساراتها المختصة.', 'Purchases, pricing and payments are not available here. Existing courses retain their established financial access policies.')}</p><Link to="/courses" className="course-primary"><ArrowLeft size={16}/>{tr('العودة إلى الدورات التدريبية', 'Back to training courses')}</Link></section></main>;
}

export function CourseLearningPathsPage() {
  const { ar, tr } = useCourseCopy();
  return <main className="courses-workspace" dir={ar ? 'rtl' : 'ltr'}><section className="course-hero"><span><Route size={18}/>{tr('تنظيم التعلم', 'Learning organization')}</span><h1>{tr('مسارات التعلم', 'Learning paths')}</h1><p>{tr('إدارة المسارات وترتيب دوراتها باستخدام العقود الحالية.', 'Manage learning paths and course order using the existing contracts.')}</p></section><Link className="course-back" to="/courses"><ArrowLeft size={16}/>{tr('العودة إلى الدورات', 'Back to courses')}</Link><section className="course-panel"><CourseLearningPathsWorkspace/></section></main>;
}
