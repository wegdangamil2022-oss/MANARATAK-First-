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
  label = 'حفظ في المفضلة',
  className = '',
  compact = true,
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={`${compact ? 'w-8 h-8' : 'min-h-8 px-2.5'} rounded-lg border flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
      active
        ? 'bg-[var(--mn-danger-soft)] border-[var(--mn-danger-border)] text-[var(--mn-danger-text)] dark:bg-[var(--mn-danger-soft)]/20 dark:border-[var(--mn-danger-border)]'
        : 'bg-[var(--mn-surface)] border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:text-[var(--mn-danger-text)] hover:border-[var(--mn-danger-border)] mn-panel '
    } ${className}`}
    aria-label={active ? 'إزالة من المفضلة' : label}
    title={active ? 'إزالة من المفضلة' : label}
  >
    <Heart className={`w-3.5 h-3.5 ${active ? 'fill-red-500 text-[var(--mn-danger-text)]' : ''}`} />
    {!compact && <span className="text-[10px] font-bold">{active ? 'محفوظ' : 'حفظ'}</span>}
  </button>
);

