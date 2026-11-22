import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { HomeSectionCta, HomeSectionHeader, HomeSectionShell } from './HomeSectionPrimitives';

export const FaqPreview: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <HomeSectionShell
      id="faq-preview-section"
      className="h-full"
      innerClassName="h-full flex flex-col justify-between"
    >
      <div className="flex h-full flex-col justify-between gap-3.5">
        <HomeSectionHeader
          title={publicT('public_have_questions')}
          subtitle={publicT('public_we_are_here_to_help_find_answers_to')}
          icon={<MessageCircleQuestion className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
          compact
          className="mb-0"
        />

        <HomeSectionCta
          id="btn-browse-faqs"
          label={publicT('public_browse_frequently_asked_questions')}
          onClick={onOpen}
        />
      </div>
    </HomeSectionShell>
  );
};
