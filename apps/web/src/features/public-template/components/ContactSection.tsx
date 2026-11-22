import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Globe2 } from 'lucide-react';
import { HomeSectionCta, HomeSectionHeader, HomeSectionShell } from './HomeSectionPrimitives';

export const ContactSection: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <HomeSectionShell
      id="contact-section"
      className="h-full"
      innerClassName="h-full flex flex-col justify-between"
    >
      <div className="flex h-full flex-col justify-between gap-3.5">
        <HomeSectionHeader
          title={publicT('public_we_are_always_close_by')}
          subtitle={publicT('public_a_wide_network_of_branches_and_authorized_agents')}
          icon={<Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
          compact
          className="mb-0"
        />

        <HomeSectionCta
          id="btn-view-contact-details"
          label={publicT('public_view_contact_and_agent_details')}
          onClick={onOpen}
        />
      </div>
    </HomeSectionShell>
  );
};
