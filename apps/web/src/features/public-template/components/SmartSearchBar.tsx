import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Search, X } from 'lucide-react';

interface SmartSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTag?: (tag: string) => void;
  onOpenAiTools?: (initialTab?: 'search' | 'letter' | 'cv' | 'chat') => void;
  selectedCountry?: string;
  onSelectCountry?: (country: string) => void;
}

/**
 * Legacy domain-search field. Global search + Smart Search now live in the
 * persistent Header; this component is intentionally deterministic and scoped
 * to whichever directory renders it.
 */
export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();
  return (
  <div className="w-full relative z-20">
    <div className="ab-search-control flex items-center border border-[var(--ab-border)] focus-within:border-[var(--ab-accent)]/70 focus-within:ring-2 focus-within:ring-[var(--ab-primary)]/10 shadow-2xs overflow-hidden transition-all ab-panel ">
      <div className="p-3 text-[var(--ab-text-muted)] flex items-center justify-center">
        <Search className="w-4 h-4" />
      </div>
      <input
        id="input-domain-search"
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={publicT('public_search_within_this_section')}
        className="min-w-0 w-full px-1 text-xs sm:text-sm text-[var(--ab-text)] placeholder-[var(--ab-text-muted)] bg-transparent focus:outline-hidden font-medium text-start font-['Cairo',sans-serif]"
        dir={publicDir}
      />
      {searchQuery && (
        <button onClick={() => onSearchChange('')} className="p-2 text-[var(--ab-text-muted)] hover:text-[var(--ab-text)] cursor-pointer" aria-label={publicT('public_clear_search')}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);
};
