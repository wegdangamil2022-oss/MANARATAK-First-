import { Link } from 'react-router-dom';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { ReadState, useWorkspaceCopy, useWorkspaceRead } from './Workspace';

export function AIRecordContext({
  resource,
  record,
}: {
  resource: string;
  record: Record<string, unknown>;
}) {
  const { c } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const related = resource === 'capabilities' || resource === 'models';
  const tools = useWorkspaceRead<{
    data: Array<{ toolKey: string; nameAr: string; nameEn: string }>;
    total: number;
  }>(
    resource === 'capabilities' && record.key && hasPermission('admin:student-tools:view')
      ? '/admin/student-tools?aiCapabilityKey=' +
          encodeURIComponent(String(record.key)) +
          '&page=1&pageSize=100'
      : null,
  );
  const consumers = useWorkspaceRead<{
    data: Array<{ key: string; allowedCapabilities?: string[]; allowedModels?: string[] }>;
  }>(related ? '/admin/ai/consumers' : null);
  const routes = useWorkspaceRead<{
    data: Array<{ key: string; capabilityKey?: string; targets?: Array<{ modelKey: string }> }>;
  }>(related ? '/admin/ai/routingPolicies' : null);
  const affectedConsumers = consumers.data?.data.filter((item) =>
    resource === 'capabilities'
      ? item.allowedCapabilities?.includes(String(record.key))
      : resource === 'models' &&
        (item.allowedModels == null || item.allowedModels.includes(String(record.key))),
  );
  const affectedRoutes = routes.data?.data.filter((item) =>
    resource === 'capabilities'
      ? item.capabilityKey === record.key
      : resource === 'models' && item.targets?.some((target) => target.modelKey === record.key),
  );
  const readiness = useWorkspaceRead<{
    ready: boolean;
    canAttempt?: boolean;
    healthVerified?: boolean;
    reason?: string;
    candidateCount: number;
  }>(
    resource === 'capabilities' && record.key
      ? `/admin/ai/capabilities/${encodeURIComponent(String(record.key))}/readiness?dataClassification=INTERNAL`
      : null,
  );
  const links = [
    ['providerKey', '/ai/catalog?tab=providers&search=', c('المزوّد المرتبط', 'Linked provider')],
    ['modelKey', '/ai/catalog?tab=models&search=', c('النموذج المرتبط', 'Linked model')],
    ['embeddingModelKey', '/ai/catalog?tab=models&search=', c('نموذج التضمين', 'Embedding model')],
    [
      'capabilityKey',
      '/ai/capabilities-prompts?tab=capabilities&search=',
      c('القدرة المرتبطة', 'Linked capability'),
    ],
  ];
  return (
    <section className="ai-form">
      <h3>{c('الاعتماديات والأثر', 'Dependencies and impact')}</h3>
      <div className="certificate-actions">
        {links
          .filter(([key]) => typeof record[key] === 'string' && record[key])
          .map(([key, url, label]) => (
            <Link
              className="certificate-link"
              key={key}
              to={url + encodeURIComponent(String(record[key]))}
            >
              {label}: {String(record[key])}
            </Link>
          ))}
        {resource === 'capabilities' && hasPermission('admin:student-tools:view') && (
          <Link className="certificate-link" to={'/student-tools'}>
            {c('فتح مكتبة أدوات الطلاب', 'Open student tools library')}
          </Link>
        )}
        {hasPermission('admin:platform:manage') && (
          <Link className="certificate-link" to="/health-readiness?view=issues">
            {c('الصحة والجاهزية', 'Health and readiness')}
          </Link>
        )}
      </div>
      {resource === 'capabilities' && hasPermission('admin:student-tools:view') && (
        <>
          <ReadState state={tools} />
          <div className="certificate-actions">
            {tools.data?.data.map((tool) => (
              <Link
                className="certificate-link"
                key={tool.toolKey}
                to={'/student-tools/' + encodeURIComponent(tool.toolKey)}
              >
                {c(tool.nameAr, tool.nameEn)}
              </Link>
            ))}
          </div>
          {tools.data && (
            <small>
              {c('الأدوات المرتبطة في السجل', 'Linked registry tools')}: {tools.data.total}
            </small>
          )}
        </>
      )}
      {related && (
        <>
          <ReadState state={consumers} />
          <ReadState state={routes} />
          <p className="certificate-notice">
            {c(
              'روابط إعدادات مرتبطة؛ لا تمثل قياسًا للاستخدام الفعلي. إيقاف سجل قد يؤثر في الجهات والمسارات التالية.',
              'Configuration relationships, not measured traffic. Disabling this record may affect these consumers and routes.',
            )}
          </p>
          <div className="certificate-actions">
            {affectedConsumers?.map((item) => (
              <Link
                className="certificate-link"
                key={item.key}
                to={'/ai/governance-quality?tab=consumers&search=' + encodeURIComponent(item.key)}
              >
                {c('جهة مستخدمة', 'Consumer')}: {item.key}
              </Link>
            ))}
            {affectedRoutes?.map((item) => (
              <Link
                className="certificate-link"
                key={item.key}
                to={'/ai/catalog?tab=routingPolicies&search=' + encodeURIComponent(item.key)}
              >
                {c('مسار توجيه', 'Routing policy')}: {item.key}
              </Link>
            ))}
            {consumers.data &&
              routes.data &&
              !affectedConsumers?.length &&
              !affectedRoutes?.length && (
                <small>
                  {c(
                    'لا توجد ارتباطات مسجلة في قوائم الجهات والمسارات.',
                    'No registered consumer or routing relationships.',
                  )}
                </small>
              )}
          </div>
        </>
      )}
      {resource === 'capabilities' && (
        <>
          <ReadState state={readiness} />
          {readiness.data && (
            <div className="certificate-notice">
              <p>
                {readiness.data.canAttempt
                  ? c(
                      'الإعدادات تسمح بمحاولة تشغيل؛ لم يُنفّذ طلب مدفوع بهذا الفحص.',
                      'Configuration permits an attempt; this check did not run paid inference.',
                    )
                  : c(
                      'التشغيل محجوب بحسب الإعدادات الحالية.',
                      'Execution is blocked by current configuration.',
                    )}{' '}
                {readiness.data.reason ?? ''}
              </p>
              <small>
                {c('نماذج مرشحة', 'Candidate models')}: {readiness.data.candidateCount} ·{' '}
                {c('تحقق حي', 'Live health verified')}:{' '}
                {readiness.data.healthVerified ? c('نعم', 'Yes') : c('غير مثبت', 'Not verified')}
              </small>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function AIExecutionSummary({ record }: { record: Record<string, unknown> }) {
  const { c } = useWorkspaceCopy();
  const labels = [
    ['publicId', 'مرجع التنفيذ', 'Execution reference'],
    ['traceId', 'مرجع التتبع', 'Trace reference'],
    ['status', 'الحالة', 'Status'],
    ['consumerKey', 'الجهة المستخدمة', 'Consumer'],
    ['capabilityKey', 'القدرة', 'Capability'],
    ['providerKey', 'المزوّد', 'Provider'],
    ['modelKey', 'النموذج', 'Model'],
    ['promptVersion', 'إصدار الموجّه', 'Prompt version'],
    ['inputTokens', 'رموز الإدخال', 'Input tokens'],
    ['outputTokens', 'رموز الإخراج', 'Output tokens'],
    ['actualCost', 'التكلفة الفعلية', 'Actual cost'],
    ['currency', 'العملة', 'Currency'],
    ['safetyDecision', 'قرار السلامة', 'Safety decision'],
    ['errorCode', 'رمز التعثر', 'Error code'],
    ['createdAt', 'تاريخ الطلب', 'Requested at'],
  ];
  return (
    <>
      <dl className="ai-definition">
        {labels.map(([key, ar, en]) => (
          <div key={key}>
            <dt>{c(ar, en)}</dt>
            <dd>{record[key] == null ? c('غير متاح', 'N/A') : String(record[key])}</dd>
          </div>
        ))}
      </dl>
      <AIRecordContext resource="executions" record={record} />
    </>
  );
}

export function AIKnowledgeSourceSummary({ record }: { record: Record<string, unknown> }) {
  const { c } = useWorkspaceCopy();
  return (
    <dl className="ai-definition">
      {[
        ['indexKey', 'الفهرس', 'Index'],
        ['sourceType', 'نوع المصدر', 'Source type'],
        ['sourceReferenceId', 'مرجع السجل الأصلي', 'Canonical record reference'],
        ['sourceVersion', 'إصدار المصدر', 'Source version'],
        ['locale', 'اللغة', 'Locale'],
        ['status', 'حالة الفهرسة', 'Indexing status'],
        ['checksum', 'بصمة المحتوى', 'Content checksum'],
      ].map(([key, ar, en]) => (
        <div key={key}>
          <dt>{c(ar, en)}</dt>
          <dd>{record[key] == null ? c('غير متاح', 'N/A') : String(record[key])}</dd>
        </div>
      ))}
    </dl>
  );
}
