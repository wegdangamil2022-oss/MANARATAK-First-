import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Building2,
  FileText,
  Coins,
  Trophy,
  Globe,
  Phone,
  GraduationCap,
} from 'lucide-react';
import type { University } from '../types';
import { DetailSectionHeader } from './DetailUi';

type Row = Record<string, unknown>;
const object = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
const text = (value: unknown): string =>
  value == null
    ? ''
    : typeof value === 'boolean'
      ? value
        ? 'نعم'
        : 'لا'
      : typeof value === 'object'
        ? ''
        : String(value);
const url = (value: unknown) => (/^https?:\/\//i.test(text(value)) ? text(value) : undefined);
const labels: Record<string, string> = {
  minimumScore: 'الدرجة المطلوبة',
  sectionScores: 'درجات الأقسام',
  validityMetadata: 'صلاحية النتيجة',
  restrictionMetadata: 'قيود القبول',
  note: 'ملاحظة',
  description: 'الوصف',
  scope: 'النطاق',
  scopeLabel: 'اسم النطاق',
  effectiveFrom: 'ساري من',
  effectiveTo: 'ساري إلى',
  officialSourceUrl: 'المصدر الرسمي',
  officialWebsite: 'الموقع الرسمي',
  contactEmail: 'البريد الإلكتروني',
  contactPhone: 'الهاتف',
  profileType: 'نوع الرسوم',
  organizationUnitName: 'الكلية / البرنامج',
  amount: 'المبلغ',
  currencyCode: 'العملة',
  accommodationAvailable: 'السكن متاح',
  internationalEligible: 'متاح للطلاب الدوليين',
  typicalCost: 'تكلفة السكن',
  averageMonthlyLivingCost: 'متوسط المعيشة الشهرية',
  livingCostCurrencyCode: 'عملة المعيشة',
  costVariationNote: 'ملاحظات التكلفة',
  verifiedAt: 'تاريخ التحقق',
  provider: 'الجهة',
  rankingYear: 'السنة',
  rank: 'المرتبة',
  campusType: 'نوع الحرم',
  address: 'العنوان',
  unitType: 'نوع الوحدة',
  latitude: 'خط العرض',
  longitude: 'خط الطول',
  acceptsDescription: 'تفاصيل القبول',
  acceptsInternationalStudents: 'قبول الطلاب الدوليين',
  undergradAdmissionUrl: 'قبول البكالوريوس',
  postgradAdmissionUrl: 'قبول الدراسات العليا',
  internationalStudentsUrl: 'الطلاب الدوليون',
  applicationPortalUrl: 'بوابة التقديم',
};
function Value({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return (
      <ul className="list-disc pr-4">
        {value.map((item, index) => (
          <li key={index}>
            <Value value={item} />
          </li>
        ))}
      </ul>
    );
  if (value && typeof value === 'object')
    return (
      <dl>
        {Object.entries(object(value))
          .filter(([key]) => !key.endsWith('Id'))
          .map(([key, item]) => (
            <div key={key}>
              <dt className="text-[var(--mn-primary)]">{labels[key] ?? key}</dt>
              <dd>
                <Value value={item} />
              </dd>
            </div>
          ))}
      </dl>
    );
  const href = url(value);
  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline text-[var(--mn-primary)]"
      >
        {text(value)}
      </a>
    );
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="w-full">{children}</table>
          </div>
        ),
        td: ({ children }) => <td className="border p-2">{children}</td>,
        th: ({ children }) => <th className="border p-2">{children}</th>,
        ul: ({ children }) => <ul className="list-disc pr-4">{children}</ul>,
      }}
    >
      {text(value)}
    </ReactMarkdown>
  );
}
function Fields({ row, keys }: { row: Row; keys: string[] }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {keys
        .filter((key) => row[key] != null && row[key] !== '')
        .map((key) => (
          <div key={key} className="rounded-lg bg-[var(--mn-surface-muted)] p-2">
            <dt className="text-[var(--mn-primary)]">{labels[key] ?? key}</dt>
            <dd>
              <Value value={row[key]} />
            </dd>
          </div>
        ))}
    </dl>
  );
}
export function PublishedUniversityDetails({
  university,
  onOpenMajor,
  onOpenExam,
}: {
  university: University;
  onOpenMajor?: (id: string) => void;
  onOpenExam?: (id: string) => void;
}) {
  const dto = university.publishedData!;
  const data = dto as unknown as Row;
  const programs = dto.academicPrograms ?? [];
  const section = (id: string, title: string, icon: typeof BookOpen, children: React.ReactNode) => (
    <section
      key={id}
      className="mn-detail-full-bleed relative bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 shadow-md mn-panel"
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
      <DetailSectionHeader id={id} title={title} icon={icon} />
      <div className="space-y-3 p-4 text-[11px] sm:text-xs font-bold leading-7 text-[var(--mn-text)]">
        {children}
      </div>
    </section>
  );
  const collection = (rows: Row[], keys: string[], heading = 'name') =>
    rows.map((row, index) => (
      <article
        key={text(row.id) || index}
        className="rounded-xl border border-[var(--mn-border)] p-3"
      >
        {row[heading] != null && (
          <h3 className="mb-2 text-[var(--mn-heading)]">{text(row[heading])}</h3>
        )}
        <Fields row={row} keys={keys} />
      </article>
    ));
  const admissions = object(dto.internationalAdmissions);
  const documents = dto.generalRequiredDocuments ?? [];
  const graduateDocuments = dto.additionalGraduateRequirements ?? [];
  return (
    <div className="flex flex-col gap-6">
      {section(
        'university-about',
        'نبذة عن الجامعة',
        BookOpen,
        <Value value={dto.description || 'لم تُضف نبذة في البيانات المنشورة.'} />,
      )}
      {section(
        'university-programs',
        'الدراسة والكليات والبرامج',
        GraduationCap,
        <>
          {!!dto.languagesOfInstruction?.length && (
            <p>لغات الدراسة: {dto.languagesOfInstruction.join('، ')}</p>
          )}
          {!!dto.availableDegrees?.length && (
            <p>الدرجات العلمية: {dto.availableDegrees.join('، ')}</p>
          )}
          {!!dto.studyModes?.length && <p>أنماط الدراسة: {dto.studyModes.join('، ')}</p>}
          {collection(dto.organizationUnits ?? [], ['unitType'])}
          {!!dto.faculties?.length && <Value value={dto.faculties} />}
          {programs.map((program, index) => {
            const degree = object(program.degreeLevel);
            return (
              <article
                key={text(program.id) || index}
                className="rounded-xl border border-[var(--mn-border)] p-3"
              >
                <h3 className="text-[var(--mn-heading)]">{text(program.sourceProgramName)}</h3>
                <p>{text(degree.nameAr) || text(degree.nameEn) || text(degree.canonicalCode)}</p>
                {program.majorMappingState === 'CANONICALLY_MAPPED' && !!program.majorId && (
                  <button
                    onClick={() => onOpenMajor?.(text(program.majorId))}
                    className="text-[var(--mn-primary)] underline"
                  >
                    تفاصيل التخصص
                  </button>
                )}
                {Array.isArray(program.admissionRequirements) &&
                  program.admissionRequirements.map((raw, index) => {
                    const requirement = object(raw);
                    const test = object(requirement.internationalTest);
                    return (
                      <div
                        key={text(requirement.id) || index}
                        className="mt-2 rounded-lg bg-[var(--mn-surface-muted)] p-2"
                      >
                        <p>
                          {text(test.displayName) ||
                            text(test.canonicalName) ||
                            'متطلب اختبار قبول'}
                        </p>
                        <Fields
                          row={requirement}
                          keys={[
                            'minimumScore',
                            'sectionScores',
                            'validityMetadata',
                            'restrictionMetadata',
                          ]}
                        />
                        {test.status === 'PUBLISHED' && (
                          <button
                            className="text-[var(--mn-primary)] underline"
                            onClick={() => onOpenExam?.(text(test.slug))}
                          >
                            تفاصيل الاختبار
                          </button>
                        )}
                      </div>
                    );
                  })}
              </article>
            );
          })}
          {!programs.length && (
            <p className="text-[var(--mn-text-muted)]">لم تُنشر برامج أكاديمية لهذه الجامعة.</p>
          )}
        </>,
      )}
      {!!dto.campuses?.length &&
        section(
          'university-campuses',
          'الحرم الجامعي والموقع',
          Building2,
          collection(dto.campuses, ['campusType', 'address', 'latitude', 'longitude']),
        )}
      {!!Object.keys(admissions).length &&
        section(
          'university-admissions',
          'قبول الطلاب الدوليين والتقديم',
          Globe,
          <Fields row={admissions} keys={Object.keys(labels).filter((key) => key in admissions)} />,
        )}
      {!!dto.admissionRequirements?.length &&
        section(
          'university-requirements',
          'متطلبات القبول',
          FileText,
          collection(
            dto.admissionRequirements,
            ['minimumScore', 'sectionScores', 'validityMetadata', 'restrictionMetadata'],
            'sourceTestName',
          ),
        )}
      {(documents.length > 0 || graduateDocuments.length > 0) &&
        section(
          'university-documents',
          'الوثائق المطلوبة',
          FileText,
          <>
            {documents.length > 0 && (
              <>
                <h3>الوثائق العامة</h3>
                <Value value={documents} />
              </>
            )}
            {graduateDocuments.length > 0 && (
              <>
                <h3>متطلبات الدراسات العليا</h3>
                <Value value={graduateDocuments} />
              </>
            )}
            <Value value={dto.officialRequiredDocumentsUrl} />
          </>,
        )}
      {!!dto.tuitionProfiles?.length &&
        section(
          'university-tuition',
          'الرسوم الدراسية',
          Coins,
          collection(dto.tuitionProfiles, [
            'profileType',
            'organizationUnitName',
            'amount',
            'currencyCode',
            'effectiveFrom',
            'effectiveTo',
            'officialSourceUrl',
          ]),
        )}
      {!!dto.tuitionReferences?.length &&
        section(
          'university-tuition-references',
          'مراجع الرسوم',
          Coins,
          <Value value={dto.tuitionReferences} />,
        )}
      {!!dto.accommodationProfiles?.length &&
        section(
          'university-housing',
          'السكن والمعيشة',
          Building2,
          collection(dto.accommodationProfiles, [
            'accommodationAvailable',
            'internationalEligible',
            'typicalCost',
            'currencyCode',
            'averageMonthlyLivingCost',
            'livingCostCurrencyCode',
            'costVariationNote',
          ]),
        )}
      {!!dto.rankings?.length &&
        section(
          'university-rankings',
          'التصنيفات العالمية',
          Trophy,
          collection(dto.rankings, [
            'provider',
            'rankingYear',
            'rank',
            'scope',
            'scopeLabel',
            'note',
            'officialSourceUrl',
            'verifiedAt',
          ]),
        )}
      {!!dto.accreditations?.length &&
        section(
          'university-accreditation',
          'الاعتمادات',
          GraduationCap,
          <Value value={dto.accreditations} />,
        )}
      {section(
        'university-contacts',
        'التواصل والروابط الرسمية',
        Phone,
        <>
          <Fields
            row={data}
            keys={['officialWebsite', 'contactEmail', 'contactPhone', 'officialSourceUrl']}
          />
          {dto.socialLinks && <Value value={dto.socialLinks} />}
        </>,
      )}
    </div>
  );
}
