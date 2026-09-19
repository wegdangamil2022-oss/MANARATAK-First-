import React from 'react';
import { University } from '../types';
import { Building2, Trophy, Globe, GraduationCap, ExternalLink, ChevronLeft } from 'lucide-react';

interface UniversitiesListProps {
  universities: University[];
  onSelectUniversity?: (uni: University) => void;
}

export const UniversitiesList: React.FC<UniversitiesListProps> = ({ universities, onSelectUniversity }) => {
  return (
    <div className="w-full px-4 py-3 space-y-3 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[var(--mn-heading)]" />
            <span>أفضل الجامعات العالمية والشريكة</span>
          </h2>
          <p className="text-[11px] text-[var(--mn-text-muted)]">
            تصفح الجامعات الرائدة التي تقدم منحاً دراسية كاملة
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {universities.map((uni) => (
          <div
            key={uni.id}
            role="button"
            tabIndex={0}
            onKeyDown={function (event) {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectUniversity?.(uni);
              }
            }}
            onClick={() => onSelectUniversity?.(uni)}
            className="bg-[var(--mn-surface)] rounded-2xl border border-[var(--mn-border)] shadow-xs hover:shadow-md transition-all overflow-hidden p-3.5 space-y-2.5 text-right hover:border-[var(--mn-border-gold)] cursor-pointer mn-panel "
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={uni.imageUrl}
                  alt={uni.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[var(--mn-border)] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--mn-heading)]">
                      {uni.name}{' '}
                      <span className="text-[var(--mn-text-muted)] font-semibold mr-0.5">
                        ({uni.nameEn.replace('University of ', '').replace(' University', '')})
                      </span>
                    </span>
                    <span className="text-xs">{uni.countryFlag}</span>
                  </div>
                </div>
              </div>

              {/* Global Rank Badge */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--mn-gold-surface)] text-[var(--mn-accent-text)] text-[10px] font-bold shrink-0 mn-panel ">
                <Trophy className="w-3 h-3 text-[var(--mn-accent-text)]" />
                <span>{uni.globalRank == null ? 'الترتيب: غير متوفر' : `المرتبة #${uni.globalRank}`}</span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--mn-text-muted)] leading-relaxed">{uni.description}</p>

            <div className="flex flex-wrap gap-1 pt-1">
              {uni.topMajors.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-[var(--mn-surface-muted)] text-[var(--mn-text)] text-[10px] font-medium mn-panel "
                >
                  {m}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--mn-border)] text-xs">
              <div className="flex items-center gap-3 text-[11px] text-[var(--mn-heading)] font-bold">
                <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" />{uni.scholarshipCount == null ? 'المنح: غير متوفرة' : `${uni.scholarshipCount} منحة معتمدة`}</span>
                <span>نسبة القبول: {uni.acceptanceRate ?? 'غير متوفرة'}</span>
              </div>

              <a
                href={uni.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--mn-accent-text)] hover:text-[var(--mn-accent-text)] hover:underline"
              >
                <span>موقع الجامعة</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
