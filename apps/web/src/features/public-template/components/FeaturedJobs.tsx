import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Briefcase } from 'lucide-react';
import { HomeSectionCta, HomeSectionHeader, HomeSectionShell } from './HomeSectionPrimitives';

interface FeaturedJobsProps {
  onViewAllClick: () => void;
}

export const FeaturedJobs: React.FC<FeaturedJobsProps> = ({ onViewAllClick }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <HomeSectionShell id="featured-jobs-section">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 md:gap-6">
        <div className="flex-1 min-w-0">
          <HomeSectionHeader
            title={publicT('public_jobs_and_internships')}
            subtitle={publicT('public_explore_jobs_internships_and_graduate_programs_in_one')}
            icon={<Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
            align="start-md"
            className="mb-0"
          />
        </div>

        <div className="w-full md:w-[270px] shrink-0">
          <HomeSectionCta
            id="btn-explore-jobs"
            label={publicT('public_explore_career_opportunities')}
            onClick={onViewAllClick}
          />
        </div>
      </div>
    </HomeSectionShell>
  );
};
