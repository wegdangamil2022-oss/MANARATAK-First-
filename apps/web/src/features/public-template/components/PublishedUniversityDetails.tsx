import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { UniversityProgramDiscovery } from './UniversityProgramDiscovery';
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
  minimumScore: "public_published_required_score",
  sectionScores: "public_published_section_scores",
  validityMetadata: "public_published_score_validity",
  restrictionMetadata: "public_published_admission_restrictions",
  note: "public_published_note",
  description: "public_published_description",
  scope: "public_published_scope",
  scopeLabel: "public_published_scope_name",
  effectiveFrom: "public_published_effective_from",
  effectiveTo: "public_published_effective_until",
  officialSourceUrl: 'المصدر الرسمي',
  officialWebsite: "public_published_official_website",
  contactEmail: "public_published_email",
  contactPhone: "public_published_phone",
  profileType: "public_published_fee_type",
  organizationUnitName: "public_published_faculty_program",
  amount: "public_published_amount",
  currencyCode: "public_published_currency",
  accommodationAvailable: "public_published_accommodation_available",
  internationalEligible: "public_published_available_to_international_students",
  typicalCost: "public_published_accommodation_cost",
  averageMonthlyLivingCost: "public_published_average_monthly_living_costs",
  livingCostCurrencyCode: "public_published_living_cost_currency",
  costVariationNote: "public_published_cost_notes",
  verifiedAt: "public_published_verification_date",
  provider: "public_published_organization",
  rankingYear: "public_published_year",
  rank: "public_published_rank",
  campusType: "public_published_campus_type",
  address: "public_published_address",
  unitType: "public_published_unit_type",
  latitude: "public_published_latitude",
  longitude: "public_published_longitude",
  acceptsDescription: "public_published_admission_details",
  acceptsInternationalStudents: "public_published_international_student_admission",
  undergradAdmissionUrl: 'قبول البكالوريوس',
  postgradAdmissionUrl: "public_published_postgraduate_admission",
  internationalStudentsUrl: "public_published_international_students",
  applicationPortalUrl: "public_published_application_portal",
};
function Value({ value }: { value: unknown }) {
  const { t: publicT } = usePublicTemplateTranslation();
  if (typeof value === 'boolean') return <span>{publicT(value ? 'public_yes' : 'public_no')}</span>;
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
              <dt className="text-[var(--ab-primary)]">{labels[key] ? publicT(labels[key]) : key}</dt>
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
        className="break-all underline text-[var(--ab-primary)]"
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
  const { t: publicT } = usePublicTemplateTranslation();
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {keys
        .filter((key) => row[key] != null && row[key] !== '')
        .map((key) => (
          <div key={key} className="rounded-lg bg-[var(--ab-surface-muted)] p-2">
            <dt className="text-[var(--ab-primary)]">{labels[key] ? publicT(labels[key]) : key}</dt>
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
  const { t: publicT } = usePublicTemplateTranslation();

  const dto = university.publishedData!;
  const data = dto as unknown as Row;
  const programs = dto.academicPrograms ?? [];
  const section = (id: string, title: string, icon: typeof BookOpen, children: React.ReactNode) => (
    <section
      key={id}
      className="ab-detail-full-bleed relative bg-[var(--ab-surface)] border-y border-[var(--ab-border-brand)]/30 shadow-md ab-panel"
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />
      <DetailSectionHeader id={id} title={title} icon={icon} />
      <div className="space-y-3 p-4 text-[11px] sm:text-xs font-bold leading-7 text-[var(--ab-text)]">
        {children}
      </div>
    </section>
  );
  const collection = (rows: Row[], keys: string[], heading = 'name') =>
    rows.map((row, index) => (
      <article
        key={text(row.id) || index}
        className="rounded-xl border border-[var(--ab-border)] p-3"
      >
        {row[heading] != null && (
          <h3 className="mb-2 text-[var(--ab-heading)]">{text(row[heading])}</h3>
        )}
        <Fields row={row} keys={keys} />
      </article>
    ));
  const admissions = object(dto.internationalAdmissions);
  const documents = dto.generalRequiredDocuments ?? [];
  const graduateDocuments = dto.additionalGraduateRequirements ?? [];
  return (
    <div className="flex flex-col gap-6">
      {dto.publicId && <UniversityProgramDiscovery universityPublicId={dto.publicId}/>}
      {section(
        'university-about',
        publicT('public_published_university_overview'),
        BookOpen,
        <Value value={dto.description || publicT('public_no_overview_has_been_added_to_the_published')} />,
      )}
      {section(
        'university-programs',
        publicT('public_published_study_faculties_and_programs'),
        GraduationCap,
        <>
          {!!dto.languagesOfInstruction?.length && (
            <p>{publicT('public_study_languages')}{' '}{dto.languagesOfInstruction.join('، ')}</p>
          )}
          {!!dto.availableDegrees?.length && (
            <p>{publicT('public_degrees_2')}{' '}{dto.availableDegrees.join('، ')}</p>
          )}
          {!!dto.studyModes?.length && <p>{publicT('public_study_arrangements')}{' '}{dto.studyModes.join('، ')}</p>}
          {collection(dto.organizationUnits ?? [], ['unitType'])}
          {!!dto.faculties?.length && <Value value={dto.faculties} />}
          {programs.map((program, index) => {
            const degree = object(program.degreeLevel);
            return (
              <article
                key={text(program.id) || index}
                className="rounded-xl border border-[var(--ab-border)] p-3"
              >
                <h3 className="text-[var(--ab-heading)]">{text(program.sourceProgramName)}</h3>
                <p>{text(degree.nameAr) || text(degree.nameEn) || text(degree.canonicalCode)}</p>
                {program.majorMappingState === 'CANONICALLY_MAPPED' && !!program.majorId && (
                  <button
                    onClick={() => onOpenMajor?.(text(program.majorId))}
                    className="text-[var(--ab-primary)] underline"
                  >{publicT('public_major_details')}</button>
                )}
                {Array.isArray(program.admissionRequirements) &&
                  program.admissionRequirements.map((raw, index) => {
                    const requirement = object(raw);
                    const test = object(requirement.internationalTest);
                    return (
                      <div
                        key={text(requirement.id) || index}
                        className="mt-2 rounded-lg bg-[var(--ab-surface-muted)] p-2"
                      >
                        <p>
                          {text(test.displayName) ||
                            text(test.canonicalName) ||
                            publicT('public_admission_exam_requirement')}
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
                            className="text-[var(--ab-primary)] underline"
                            onClick={() => onOpenExam?.(text(test.slug))}
                          >{publicT('public_exam_details')}</button>
                        )}
                      </div>
                    );
                  })}
              </article>
            );
          })}
          {!programs.length && (
            <p className="text-[var(--ab-text-muted)]">{publicT('public_no_academic_programs_have_been_published_for_this')}</p>
          )}
        </>,
      )}
      {!!dto.campuses?.length &&
        section(
          'university-campuses',
          publicT('public_published_campus_and_location'),
          Building2,
          collection(dto.campuses, ['campusType', 'address', 'latitude', 'longitude']),
        )}
      {!!Object.keys(admissions).length &&
        section(
          'university-admissions',
          publicT('public_published_international_student_admission_and_applications'),
          Globe,
          <Fields row={admissions} keys={Object.keys(labels).filter((key) => key in admissions)} />,
        )}
      {!!dto.admissionRequirements?.length &&
        section(
          'university-requirements',
          publicT('public_published_admission_requirements'),
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
          publicT('public_published_required_documents'),
          FileText,
          <>
            {documents.length > 0 && (
              <>
                <h3>{publicT('public_general_documents')}</h3>
                <Value value={documents} />
              </>
            )}
            {graduateDocuments.length > 0 && (
              <>
                <h3>{publicT('public_postgraduate_requirements')}</h3>
                <Value value={graduateDocuments} />
              </>
            )}
            <Value value={dto.officialRequiredDocumentsUrl} />
          </>,
        )}
      {!!dto.tuitionProfiles?.length &&
        section(
          'university-tuition',
          publicT('public_published_tuition_fees'),
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
          publicT('public_published_fee_references'),
          Coins,
          <Value value={dto.tuitionReferences} />,
        )}
      {!!dto.accommodationProfiles?.length &&
        section(
          'university-housing',
          publicT('public_published_accommodation_and_living'),
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
          publicT('public_published_international_rankings'),
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
          publicT('public_published_accreditations'),
          GraduationCap,
          <Value value={dto.accreditations} />,
        )}
      {section(
        'university-contacts',
        publicT('public_published_contact_details_and_official_links'),
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
