import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  active: boolean;
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  active,
  onToggle,
  label,
  className = '',
  compact = true,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();
  const accessibleLabel = active
    ? publicT('public_remove_from_favorites')
    : label ?? publicT('public_save_to_favorites');
  return (
  <button
    type="button"
    onClick={onToggle}
    className={`${compact ? 'w-8 h-8 rounded-full' : 'min-h-8 px-2.5 rounded-lg'} border flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
      active
        ? 'bg-[var(--mn-page)] border-[var(--mn-border)] text-[var(--mn-primary)] dark:text-[var(--mn-accent-soft)] mn-panel '
        : 'bg-[var(--mn-page)] border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)] mn-panel '
    } ${className}`}
    aria-label={accessibleLabel}
    title={accessibleLabel}
  >
    <Heart className={`w-4 h-4 ${active ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]' : 'text-[var(--mn-text-muted)]'}`} />
    {!compact && <span className="text-[10px] font-bold">{active ? publicT('public_saved_2') : publicT('public_save')}</span>}
  </button>
);
};
