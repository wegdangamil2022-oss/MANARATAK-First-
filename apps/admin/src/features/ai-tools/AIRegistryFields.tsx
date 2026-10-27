import { AIProviderType, AIRequestPurpose } from '@manaratak/domain';
import { useWorkspaceCopy, useWorkspaceRead } from './Workspace';

type RecordValue = Record<string, unknown>;
type Field = {
  key: string;
  ar: string;
  en: string;
  type?: 'number' | 'boolean' | 'lines' | 'select';
  options?: string[];
  reference?: 'providers' | 'models' | 'capabilities';
  min?: number;
};
const classifications = [
  'PUBLIC',
  'INTERNAL',
  'CONFIDENTIAL',
  'STUDENT_PRIVATE',
  'HIGHLY_SENSITIVE',
];
const kinds = [
  'TEXT_GENERATION',
  'CHAT',
  'STRUCTURED_OUTPUT',
  'EMBEDDINGS',
  'RERANKING',
  'MODERATION',
];
const fields: Record<string, Field[]> = {
  providers: [
    { key: 'displayName', ar: 'اسم المزوّد', en: 'Provider name' },
    {
      key: 'type',
      ar: 'نوع المحول',
      en: 'Adapter type',
      type: 'select',
      options: Object.values(AIProviderType),
    },
    {
      key: 'secretReference',
      ar: 'مرجع السر في البيئة — دون قيمته',
      en: 'Environment secret reference — never its value',
    },
    { key: 'baseUrl', ar: 'عنوان الاتصال المعتمد', en: 'Approved endpoint' },
    {
      key: 'timeoutMs',
      ar: 'مهلة الطلب بالمللي ثانية',
      en: 'Timeout in milliseconds',
      type: 'number',
      min: 1,
    },
    {
      key: 'maxRetries',
      ar: 'أقصى محاولات الإعادة',
      en: 'Maximum retries',
      type: 'number',
      min: 0,
    },
    {
      key: 'maxDataClassification',
      ar: 'أعلى تصنيف بيانات',
      en: 'Maximum data classification',
      type: 'select',
      options: classifications,
    },
    {
      key: 'productionApproved',
      ar: 'معتمد للاستخدام الإنتاجي',
      en: 'Approved for production use',
      type: 'boolean',
    },
  ],
  models: [
    { key: 'displayName', ar: 'اسم النموذج', en: 'Model name' },
    { key: 'providerKey', ar: 'المزوّد', en: 'Provider', reference: 'providers' },
    { key: 'providerModelId', ar: 'معرف النموذج لدى المزوّد', en: 'Provider model identifier' },
    {
      key: 'capabilities',
      ar: 'أنواع القدرات — قيمة في كل سطر',
      en: 'Capability kinds — one per line',
      type: 'lines',
    },
    { key: 'contextWindow', ar: 'نافذة السياق', en: 'Context window', type: 'number', min: 1 },
    {
      key: 'maxOutputTokens',
      ar: 'أقصى رموز المخرجات',
      en: 'Maximum output tokens',
      type: 'number',
      min: 1,
    },
    ...['supportsStreaming', 'supportsTools', 'supportsStructuredOutput', 'productionApproved'].map(
      (key, i) => ({
        key,
        ar: ['دعم البث', 'دعم استدعاء الأدوات', 'دعم النتائج المنظمة', 'معتمد للاستخدام الإنتاجي'][
          i
        ],
        en: ['Streaming', 'Tool calls', 'Structured output', 'Approved for production use'][i],
        type: 'boolean' as const,
      }),
    ),
    {
      key: 'maxDataClassification',
      ar: 'أعلى تصنيف بيانات',
      en: 'Maximum data classification',
      type: 'select',
      options: classifications,
    },
  ],
  modelPrices: [
    { key: 'modelKey', ar: 'النموذج', en: 'Model', reference: 'models' },
    { key: 'currency', ar: 'رمز العملة', en: 'Currency code' },
    {
      key: 'inputPricePerMillion',
      ar: 'تكلفة مليون رمز إدخال',
      en: 'Input price per million tokens',
      type: 'number',
      min: 0,
    },
    {
      key: 'outputPricePerMillion',
      ar: 'تكلفة مليون رمز إخراج',
      en: 'Output price per million tokens',
      type: 'number',
      min: 0,
    },
    { key: 'effectiveFrom', ar: 'بداية السريان — ISO 8601', en: 'Effective from — ISO 8601' },
    { key: 'effectiveTo', ar: 'نهاية السريان — اختياري', en: 'Effective to — optional' },
  ],
  capabilities: [
    { key: 'displayNameAr', ar: 'الاسم بالعربية', en: 'Arabic name' },
    { key: 'displayNameEn', ar: 'الاسم بالإنجليزية', en: 'English name' },
    { key: 'kind', ar: 'نوع القدرة', en: 'Capability kind', type: 'select', options: kinds },
    {
      key: 'riskLevel',
      ar: 'مستوى المخاطر',
      en: 'Risk level',
      type: 'select',
      options: ['LOW', 'MEDIUM', 'HIGH', 'PROHIBITED'],
    },
    {
      key: 'allowedPurposes',
      ar: 'أغراض الاستخدام المسموحة — قيمة في كل سطر',
      en: 'Allowed purposes — one per line',
      type: 'lines',
      options: Object.values(AIRequestPurpose),
    },
    {
      key: 'allowedDataClassifications',
      ar: 'تصنيفات البيانات المسموحة — قيمة في كل سطر',
      en: 'Allowed data classifications — one per line',
      type: 'lines',
      options: classifications,
    },
    {
      key: 'requiresHumanReview',
      ar: 'يتطلب مراجعة بشرية — يمنع التشغيل حتى تهيئة مسارها',
      en: 'Requires human review — blocks execution until its workflow exists',
      type: 'boolean',
    },
  ],
  routingPolicies: [
    { key: 'capabilityKey', ar: 'القدرة', en: 'Capability', reference: 'capabilities' },
    { key: 'consumerKey', ar: 'الجهة المستخدمة — اختياري', en: 'Consumer key — optional' },
    { key: 'fallbackEnabled', ar: 'السماح بالبدائل', en: 'Allow fallback', type: 'boolean' },
    {
      key: 'maxAttempts',
      ar: 'أقصى محاولات التنفيذ',
      en: 'Maximum attempts',
      type: 'number',
      min: 1,
    },
  ],
  prompts: [
    { key: 'capabilityKey', ar: 'القدرة', en: 'Capability', reference: 'capabilities' },
    {
      key: 'purpose',
      ar: 'الغرض',
      en: 'Purpose',
      type: 'select',
      options: Object.values(AIRequestPurpose),
    },
    { key: 'descriptionAr', ar: 'الوصف بالعربية', en: 'Arabic description' },
    { key: 'descriptionEn', ar: 'الوصف بالإنجليزية', en: 'English description' },
  ],
  guardrails: [
    {
      key: 'stage',
      ar: 'مرحلة الفحص',
      en: 'Inspection stage',
      type: 'select',
      options: ['INPUT', 'OUTPUT', 'BOTH'],
    },
    {
      key: 'action',
      ar: 'الإجراء',
      en: 'Action',
      type: 'select',
      options: ['ALLOW', 'REDACT', 'BLOCK', 'REQUIRE_REVIEW'],
    },
    { key: 'version', ar: 'إصدار الضابط', en: 'Guardrail version', type: 'number', min: 1 },
  ],
  consumers: [
    { key: 'displayName', ar: 'اسم الجهة المستخدمة', en: 'Consumer name' },
    {
      key: 'allowedCapabilities',
      ar: 'مفاتيح القدرات المسموحة — مفتاح في كل سطر',
      en: 'Allowed capability keys — one per line',
      type: 'lines',
    },
    {
      key: 'allowedModels',
      ar: 'النماذج المسموحة — فارغ يعني دون قائمة تخصيص',
      en: 'Allowed models — empty means no custom allowlist',
      type: 'lines',
    },
    ...['requestsPerMinute', 'dailyRequestLimit', 'monthlyTokenLimit', 'monthlyCostLimit'].map(
      (key, i) => ({
        key,
        ar: [
          'طلبات في الدقيقة',
          'الحد اليومي للطلبات',
          'الحد الشهري للرموز',
          'الحد الشهري للتكلفة',
        ][i],
        en: [
          'Requests per minute',
          'Daily request limit',
          'Monthly token limit',
          'Monthly cost limit',
        ][i],
        type: 'number' as const,
        min: 0,
      }),
    ),
    { key: 'currency', ar: 'عملة الميزانية', en: 'Budget currency' },
    {
      key: 'allowedDataClassifications',
      ar: 'تصنيفات البيانات المسموحة — قيمة في كل سطر',
      en: 'Allowed data classifications — one per line',
      type: 'lines',
      options: classifications,
    },
    {
      key: 'requireHumanReview',
      ar: 'اشتراط المراجعة البشرية — مسارها غير مهيأ حاليًا',
      en: 'Require human review — workflow currently unavailable',
      type: 'boolean',
    },
    {
      key: 'allowAsyncJobs',
      ar: 'السماح بالمهام الخلفية',
      en: 'Allow background jobs',
      type: 'boolean',
    },
  ],
  workflows: [
    { key: 'displayNameAr', ar: 'الاسم بالعربية', en: 'Arabic name' },
    { key: 'displayNameEn', ar: 'الاسم بالإنجليزية', en: 'English name' },
  ],
  evaluations: [
    { key: 'displayName', ar: 'اسم التقييم', en: 'Evaluation name' },
    { key: 'capabilityKey', ar: 'القدرة', en: 'Capability', reference: 'capabilities' },
  ],
  knowledgeIndexes: [
    { key: 'displayName', ar: 'اسم الفهرس', en: 'Index name' },
    { key: 'embeddingModelKey', ar: 'نموذج التضمين', en: 'Embedding model', reference: 'models' },
    { key: 'dimensions', ar: 'الأبعاد', en: 'Dimensions', type: 'number', min: 1 },
    {
      key: 'sourceDomains',
      ar: 'مجالات المصادر — قيمة في كل سطر',
      en: 'Source domains — one per line',
      type: 'lines',
    },
  ],
  incidents: [
    { key: 'title', ar: 'عنوان الحادث', en: 'Incident title' },
    { key: 'description', ar: 'الوصف دون بيانات خاصة', en: 'Description without private data' },
    {
      key: 'severity',
      ar: 'الأهمية',
      en: 'Severity',
      type: 'select',
      options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
  ],
  platformSettings: [
    {
      key: 'globalEnabled',
      ar: 'تشغيل AI — إعادة التفعيل من مسار الاعتماد فقط',
      en: 'Enable AI — re-enable only through approval',
      type: 'boolean',
    },
  ],
};
export function AIRegistryFields({
  resource,
  json,
  onChange,
}: {
  resource: string;
  json: string;
  onChange: (value: string) => void;
}) {
  const { c } = useWorkspaceCopy();
  const providers = useWorkspaceRead<{ data: Array<{ key: string }> }>(
    fields[resource]?.some((field) => field.reference === 'providers')
      ? '/admin/ai/providers'
      : null,
  );
  const models = useWorkspaceRead<{ data: Array<{ key: string }> }>(
    resource === 'routingPolicies' ||
      fields[resource]?.some((field) => field.reference === 'models')
      ? '/admin/ai/models'
      : null,
  );
  const capabilities = useWorkspaceRead<{ data: Array<{ key: string }> }>(
    fields[resource]?.some((field) => field.reference === 'capabilities')
      ? '/admin/ai/capabilities'
      : null,
  );
  let value: RecordValue;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    value = parsed as RecordValue;
  } catch {
    return (
      <p role="alert">
        {c('صحح تنسيق الإعدادات المتقدمة أولًا.', 'Correct the advanced settings format first.')}
      </p>
    );
  }
  const change = (key: string, next: unknown) =>
    onChange(JSON.stringify({ ...value, [key]: next }, null, 2));
  const references = { providers, models, capabilities };
  const targets = Array.isArray(value.targets) ? (value.targets as RecordValue[]) : [];
  return (
    <div className="ai-form">
      {(fields[resource] ?? []).map((field) => {
        const current = value[field.key];
        const options = field.reference
          ? (references[field.reference].data?.data ?? []).map((item) => item.key)
          : field.options;
        return (
          <label key={field.key} className={field.type === 'boolean' ? 'ai-check' : undefined}>
            {field.type === 'boolean' ? (
              <>
                <input
                  type="checkbox"
                  checked={current === true}
                  onChange={(event) => change(field.key, event.target.checked)}
                />
                {c(field.ar, field.en)}
              </>
            ) : (
              <>
                {c(field.ar, field.en)}
                {field.reference || field.type === 'select' ? (
                  <select
                    value={String(current ?? '')}
                    onChange={(event) => change(field.key, event.target.value)}
                  >
                    <option value="">{c('اختر', 'Select')}</option>
                    {Array.from(
                      new Set([
                        ...(options ?? []),
                        ...(typeof current === 'string' && current ? [current] : []),
                      ]),
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'lines' ? (
                  <textarea
                    rows={3}
                    value={Array.isArray(current) ? current.join('\n') : ''}
                    onChange={(event) => {
                      const entries = event.target.value
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean);
                      change(
                        field.key,
                        field.key === 'allowedModels' && !entries.length ? null : entries,
                      );
                    }}
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    step={field.type === 'number' ? 'any' : undefined}
                    min={field.min}
                    value={
                      typeof current === 'string' || typeof current === 'number' ? current : ''
                    }
                    onChange={(event) =>
                      change(
                        field.key,
                        field.type === 'number'
                          ? event.target.value === ''
                            ? null
                            : Number(event.target.value)
                          : event.target.value === '' &&
                              ['baseUrl', 'effectiveTo', 'consumerKey'].includes(field.key)
                            ? null
                            : event.target.value,
                      )
                    }
                  />
                )}
                {field.type === 'lines' && options && <small>{options.join(' · ')}</small>}
              </>
            )}
          </label>
        );
      })}
      {resource === 'routingPolicies' && (
        <fieldset>
          <legend>{c('النماذج المستهدفة بالترتيب', 'Routing targets')}</legend>
          {targets.map((target, index) => (
            <div key={index} className="ai-dependency">
              <label>
                {c('النموذج', 'Model')}
                <select
                  value={String(target.modelKey ?? '')}
                  onChange={(event) =>
                    change(
                      'targets',
                      targets.map((item, i) =>
                        i === index ? { ...item, modelKey: event.target.value } : item,
                      ),
                    )
                  }
                >
                  <option value="">{c('اختر النموذج', 'Select model')}</option>
                  {Array.from(
                    new Set([
                      ...(models.data?.data ?? []).map((item) => item.key),
                      String(target.modelKey ?? ''),
                    ]),
                  )
                    .filter(Boolean)
                    .map((key) => (
                      <option key={key}>{key}</option>
                    ))}
                </select>
              </label>
              {(['priority', 'weight'] as const).map((key) => (
                <label key={key}>
                  {key === 'priority' ? c('الأولوية', 'Priority') : c('الوزن', 'Weight')}
                  <input
                    type="number"
                    min={0}
                    value={Number(target[key] ?? 0)}
                    onChange={(event) =>
                      change(
                        'targets',
                        targets.map((item, i) =>
                          i === index ? { ...item, [key]: Number(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <label className="ai-check">
                <input
                  type="checkbox"
                  checked={target.enabled === true}
                  onChange={(event) =>
                    change(
                      'targets',
                      targets.map((item, i) =>
                        i === index ? { ...item, enabled: event.target.checked } : item,
                      ),
                    )
                  }
                />
                {c('مفعّل', 'Enabled')}
              </label>
              <button
                type="button"
                onClick={() =>
                  change(
                    'targets',
                    targets.filter((_, i) => i !== index),
                  )
                }
              >
                {c('حذف الهدف', 'Remove target')}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              change('targets', [
                ...targets,
                { modelKey: '', priority: targets.length + 1, weight: 1, enabled: true },
              ])
            }
          >
            {c('إضافة نموذج مستهدف', 'Add routing target')}
          </button>
        </fieldset>
      )}
      {resource === 'guardrails' && (
        <label>
          {c('أنماط الفحص — نمط في كل سطر', 'Inspection patterns — one per line')}
          <textarea
            rows={4}
            value={
              Array.isArray((value.rules as RecordValue)?.patterns)
                ? ((value.rules as RecordValue).patterns as string[]).join('\n')
                : ''
            }
            onChange={(event) =>
              change('rules', {
                ...(value.rules as RecordValue),
                patterns: event.target.value.split('\n').filter(Boolean),
              })
            }
          />
        </label>
      )}
      {resource === 'knowledgeIndexes' && (
        <fieldset>
          <legend>{c('تقسيم المحتوى', 'Chunking')}</legend>
          {['maxCharacters', 'overlapCharacters'].map((key) => (
            <label key={key}>
              {key === 'maxCharacters'
                ? c('أقصى أحرف للمقطع', 'Maximum chunk characters')
                : c('أحرف التداخل', 'Overlap characters')}
              <input
                type="number"
                min={0}
                value={Number((value.chunkingStrategy as RecordValue)?.[key] ?? 0)}
                onChange={(event) =>
                  change('chunkingStrategy', {
                    ...(value.chunkingStrategy as RecordValue),
                    [key]: Number(event.target.value),
                  })
                }
              />
            </label>
          ))}
        </fieldset>
      )}
      {['workflows', 'evaluations'].includes(resource) && (
        <p className="certificate-notice">
          {c(
            'تعريف الخطوات وبيانات التقييم المركبة متاح في المحرر المتقدم أدناه، ويخضع للتحقق من الخادم.',
            'Complex workflow steps and evaluation datasets use the advanced editor below and server validation.',
          )}
        </p>
      )}
    </div>
  );
}
