import { useSearchParams } from 'react-router-dom';
import { Activity, BellRing, FileSearch, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  OperationsHeading,
  OperationsNavigation,
} from '../features/operations/OperationsWorkspace';
import { AuditWorkspacePanel } from '../components/AuditWorkspacePanel';
import { AuditRecordsWorkspace } from './audit/AuditRecordsWorkspace';

export function AuditCenterPage() {
  const { language, dir } = useTranslation();
  const c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const { hasPermission } = useAdminAuthorization();
  const [params] = useSearchParams();
  const entries = [
    {
      id: 'activities',
      permission: 'admin:audit:manage',
      label: c('سجل الأنشطة', 'Activity log'),
      description: c('البحث والأحداث والتصدير', 'Search, events and exports'),
      icon: Activity,
    },
    {
      id: 'investigations',
      permission: 'admin:audit:cases:view',
      label: c('التحقيقات', 'Investigations'),
      description: c('القضايا والأدلة والمتابعة', 'Cases, evidence and follow-up'),
      icon: FileSearch,
    },
    {
      id: 'alerts',
      permission: 'admin:audit:alerts:manage',
      label: c('التنبيهات', 'Alerts'),
      description: c('القواعد والحالات المرصودة', 'Rules and observed occurrences'),
      icon: BellRing,
    },
    {
      id: 'integrity',
      permission: 'admin:audit:manage',
      label: c('سلامة السجل والاحتفاظ', 'Integrity and retention'),
      description: c('نطاق الفحص وسياسة الاحتفاظ', 'Check scope and retention policy'),
      icon: ShieldCheck,
    },
  ].filter((entry) => hasPermission(entry.permission));
  if (
    !entries.some((entry) => entry.id === 'integrity') &&
    hasPermission('admin:audit:retention:manage')
  )
    entries.push({
      id: 'integrity',
      permission: 'admin:audit:retention:manage',
      label: c('سلامة السجل والاحتفاظ', 'Integrity and retention'),
      description: c('سياسة الاحتفاظ المصرح بها', 'Authorized retention policy'),
      icon: ShieldCheck,
    });
  const active = entries.find((entry) => entry.id === params.get('tab'))?.id ?? entries[0]?.id;
  return (
    <div className="operations-workspace" dir={dir}>
      <OperationsHeading
        title={c('سجل التدقيق', 'Audit center')}
        description={c(
          'تتبّع العمليات والتحقيق فيها ضمن نطاق صلاحيتك.',
          'Trace and investigate operations within your authorized scope.',
        )}
        icon={ShieldCheck}
      />
      <OperationsNavigation
        items={entries.map((entry) => {
          const query = new URLSearchParams(params);
          query.set('tab', entry.id);
          return { ...entry, to: '/audit?' + query };
        })}
        active={active ?? ''}
        label={c('مساحات التدقيق', 'Audit workspaces')}
      />
      {active === 'activities' && <AuditRecordsWorkspace key="activities" />}
      {active === 'investigations' && <AuditWorkspacePanel kind="CASE" />}
      {active === 'alerts' && <AuditWorkspacePanel kind="ALERT_RULE" />}
      {active === 'integrity' && (
        <>
          {hasPermission('admin:audit:manage') && (
            <AuditRecordsWorkspace key="integrity" view="integrity" />
          )}
          {hasPermission('admin:audit:retention:manage') && (
            <AuditWorkspacePanel kind="RETENTION_POLICY" />
          )}
        </>
      )}
    </div>
  );
}
