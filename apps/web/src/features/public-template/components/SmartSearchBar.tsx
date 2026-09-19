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
}) => (
  <div className="w-full relative z-20">
    <div className="mn-search-control flex items-center border border-[var(--mn-border)] focus-within:border-[var(--mn-accent)]/70 focus-within:ring-2 focus-within:ring-[var(--mn-primary)]/10 shadow-2xs overflow-hidden transition-all mn-panel ">
      <div className="p-3 text-[var(--mn-text-muted)] flex items-center justify-center">
        <Search className="w-4 h-4" />
      </div>
      <input
        id="input-domain-search"
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="ابحث داخل هذا القسم..."
        className="min-w-0 w-full px-1 text-xs sm:text-sm text-[var(--mn-text)] placeholder-[var(--mn-text-muted)] bg-transparent focus:outline-hidden font-medium text-right font-['Cairo',sans-serif]"
        dir="rtl"
      />
      {searchQuery && (
        <button onClick={() => onSearchChange('')} className="p-2 text-[var(--mn-text-muted)] hover:text-[var(--mn-text)] cursor-pointer" aria-label="مسح البحث">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);
