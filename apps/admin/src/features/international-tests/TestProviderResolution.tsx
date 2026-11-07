import type { InternationalTestDto } from '@manaratak/domain';
import { Building2 } from 'lucide-react';

type Resolution = {
  mode: 'SINGLE_PROVIDER' | 'MULTIPLE_PROVIDERS' | 'DECENTRALIZED_ADMINISTRATION';
  noteAr: string;
  providers: Array<{ providerId: string; displayName: string }>;
};
export function reviewedTestProviderResolution(
  test: Pick<InternationalTestDto, 'optionalFields'>,
): Resolution | null {
  const raw = test.optionalFields?.providerReviewResolution;
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (
    value.reviewStatus !== 'RESOLVED' ||
    !['SINGLE_PROVIDER', 'MULTIPLE_PROVIDERS', 'DECENTRALIZED_ADMINISTRATION'].includes(
      String(value.mode),
    ) ||
    typeof value.noteAr !== 'string' ||
    !Array.isArray(value.providers)
  )
    return null;
  const providers = value.providers.filter((p): p is { providerId: string; displayName: string } =>
    Boolean(
      p &&
      typeof p === 'object' &&
      typeof p.providerId === 'string' &&
      typeof p.displayName === 'string',
    ),
  );
  if (
    providers.length !== value.providers.length ||
    (value.mode !== 'DECENTRALIZED_ADMINISTRATION' && !providers.length)
  )
    return null;
  return { mode: value.mode as Resolution['mode'], noteAr: value.noteAr, providers };
}
export function TestProviderResolution({
  test,
  isRtl,
}: {
  test: Pick<InternationalTestDto, 'optionalFields'>;
  isRtl: boolean;
}) {
  const resolution = reviewedTestProviderResolution(test);
  if (!resolution) return null;
  const label =
    resolution.mode === 'MULTIPLE_PROVIDERS'
      ? isRtl
        ? 'جهات متعددة — تمت مراجعتها'
        : 'Multiple providers — reviewed'
      : resolution.mode === 'DECENTRALIZED_ADMINISTRATION'
        ? isRtl
          ? 'تنظيم محلي حسب الإقليم — تمت مراجعته'
          : 'Regional administration — reviewed'
        : isRtl
          ? 'جهة الاختبار — تم التحقق من العلاقة'
          : 'Test provider — relationship verified';
  return (
    <section
      className="rounded-xl border border-[#DDEFF2] bg-[#FAF7F0] p-3 text-[12px]"
      aria-label={isRtl ? 'نتيجة مراجعة الجهة' : 'Provider review result'}
    >
      <h3 className="flex items-center gap-2 font-bold text-[#142B5F]">
        <Building2 size={16} className="text-[#0E7C86]" />
        {label}
      </h3>
      <p className="mt-2">
        {isRtl
          ? resolution.noteAr
          : 'Provider scope varies by qualification, jurisdiction or centre; consult the reviewed evidence before registration.'}
      </p>
      {resolution.providers.length > 0 && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {resolution.providers.map((provider) => (
            <li
              key={provider.providerId}
              className="rounded-lg border border-[#DDEFF2] bg-white px-3 py-2"
            >
              {provider.displayName}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
