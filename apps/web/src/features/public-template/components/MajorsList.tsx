import React from 'react';
import { Major } from '../types';
import { Layers } from 'lucide-react';
import { MajorCard } from './MajorCard';

interface MajorsListProps {
  majors: Major[];
  onSelectMajor?: (major: Major) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const MajorsList: React.FC<MajorsListProps> = ({
  majors,
  onSelectMajor,
  favoriteIds = [],
  onToggleFavorite,
}) => {
  return (
    <div className="w-full px-2 sm:px-4 py-3 space-y-3 pb-20 font-['Cairo',sans-serif] select-none" dir="rtl">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-[var(--mn-heading)] flex items-center gap-1.5 font-['Cairo',sans-serif]">
            <Layers className="w-4 h-4 text-[var(--mn-heading)]" />
            <span>دليل التخصصات الأكاديمية والمهنية</span>
          </h2>
          <p className="text-[10px] sm:text-[11px] text-[var(--mn-text-muted)] font-bold font-['Cairo',sans-serif] mt-0.5">
            اكتشف أكثر التخصصات طلباً للتمويل والفرص المستقبلية
          </p>
        </div>
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {majors.map((major) => (
          <MajorCard
            key={major.id}
            major={major}
            isFavorited={favoriteIds.includes(major.id)}
            onToggleFavorite={onToggleFavorite}
            onSelectMajor={onSelectMajor}
          />
        ))}
      </div>
    </div>
  );
};
