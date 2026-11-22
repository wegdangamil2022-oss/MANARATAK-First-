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
        ? 'bg-[#0E7C86]/10 dark:bg-[#38C6D4]/14 border-[#0E7C86]/35 dark:border-[#38C6D4]/45 text-[#0E7C86] dark:text-[#38C6D4] mn-panel '
        : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 border-[#142B5F]/12 dark:border-white/12 text-[#5C707C] dark:text-[#9BB4C7] hover:border-[#0E7C86]/40 hover:text-[#0E7C86] dark:hover:text-[#38C6D4] mn-panel '
    } ${className}`}
    aria-label={accessibleLabel}
    title={accessibleLabel}
  >
    <Heart className={`w-4 h-4 ${active ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
    {!compact && <span className="text-[10px] font-bold">{active ? publicT('public_saved_2') : publicT('public_save')}</span>}
  </button>
);
};
