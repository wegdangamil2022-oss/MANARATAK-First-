import { useSearchParams } from 'react-router-dom';
import { Inbox, Users, Activity, Settings2, LifeBuoy } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  OperationsHeading,
  OperationsNavigation,
} from '../features/operations/OperationsWorkspace';
import { StudentDirectoryWorkspace } from './support/StudentDirectoryWorkspace';
import { SupportInbox } from './support/SupportInbox';
import { SupportQualityWorkspace } from './support/SupportQualityWorkspace';
export function StudentSupportAdminPage() {
  const { language, dir } = useTranslation(),
    { hasPermission } = useAdminAuthorization(),
    [params] = useSearchParams(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const entries = [
    {
      id: 'inbox',
      permission: 'admin:students:support:cases:view',
      label: c('صندوق الدعم', 'Support inbox'),
      description: c('تذاكر وردود ومتابعة', 'Cases, replies and follow-up'),
      icon: Inbox,
    },
    {
      id: 'directory',
      permission: 'admin:students:support',
      label: c('دليل الطلاب', 'Student directory'),
      description: c('الحساب والأقسام المرتبطة', 'Accounts and linked owners'),
      icon: Users,
    },
    {
      id: 'diagnostics',
      permission: 'admin:students:support',
      label: c('التشخيص والمتابعة', 'Diagnostics'),
      description: c('التهيئة ومشكلات الأقسام', 'Provisioning and owner issues'),
      icon: Activity,
    },
    {
      id: 'quality',
      permission: 'admin:students:support:settings',
      label: c('الجودة والإعدادات', 'Quality and settings'),
      description: c('الفرق والسياسات والردود', 'Teams, policies and saved replies'),
      icon: Settings2,
    },
  ].filter((item) => hasPermission(item.permission));
  if (!entries.some((e) => e.id === 'quality') && hasPermission('admin:students:support:metrics'))
    entries.push({
      id: 'quality',
      permission: 'admin:students:support:metrics',
      label: c('مؤشرات الجودة', 'Quality metrics'),
      description: c('مجاميع ضمن نطاقك', 'Scoped aggregates'),
      icon: Settings2,
    });
  const active =
    entries.find((e) => e.id === params.get('tab'))?.id ??
    (params.has('student') && hasPermission('admin:students:support')
      ? 'directory'
      : entries[0]?.id);
  return (
    <div className="operations-workspace" dir={dir}>
      <OperationsHeading
        title={c('دعم الطلاب', 'Student support')}
        description={c(
          'تواصل واضح مع الطالب، ومتابعة تشغيلية تحافظ على حدود صلاحيات الأقسام.',
          'Clear student conversations and follow-up within owner permission boundaries.',
        )}
        icon={LifeBuoy}
      />
      <OperationsNavigation
        label={c('مساحات دعم الطلاب', 'Student support workspaces')}
        active={active ?? ''}
        items={entries.map((item) => ({
          ...item,
          to: '/students/support?' + new URLSearchParams({ tab: item.id }),
        }))}
      />
      {active === 'inbox' && <SupportInbox />}
      {active === 'directory' && <StudentDirectoryWorkspace key="directory" />}
      {active === 'diagnostics' && (
        <StudentDirectoryWorkspace key="diagnostics" view="diagnostics" />
      )}
      {active === 'quality' && <SupportQualityWorkspace />}
    </div>
  );
}
