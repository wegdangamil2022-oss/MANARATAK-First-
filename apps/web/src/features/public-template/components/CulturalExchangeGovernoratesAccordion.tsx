import React, { useMemo, useState } from 'react';
import {
  ArrowDownNarrowWide,
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  PlaneTakeoff,
  Search,
  Stethoscope,
} from 'lucide-react';

export interface GovernorateSeats {
  id: number;
  name: string;
  isSpecialCategory?: boolean;
  bachelorTotal: number;
  bachelorDistribution: { country: string; count: number }[];
  masterTotal: number;
  masterDistribution: { country: string; count: number }[];
  medicineTotal: number;
  medicineDistribution: { country: string; count: number }[];
}

export const GOVERNORATES_2026_DATA: GovernorateSeats[] = [
  {
    id: 1,
    name: 'عدن',
    bachelorTotal: 22,
    bachelorDistribution: [
      { country: 'الأردن', count: 11 },
      { country: 'المجر', count: 5 },
      { country: 'الجزائر', count: 3 },
      { country: 'المغرب', count: 2 },
      { country: 'الصين', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 7,
    masterDistribution: [
      { country: 'المجر', count: 4 },
      { country: 'الصين', count: 3 },
    ],
    medicineTotal: 5,
    medicineDistribution: [
      { country: 'الأردن', count: 3 },
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 2,
    name: 'لحج',
    bachelorTotal: 19,
    bachelorDistribution: [
      { country: 'الأردن', count: 8 },
      { country: 'المجر', count: 5 },
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 2 },
      { country: 'كوبا', count: 2 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 7,
    medicineDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'كوبا', count: 2 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 3,
    name: 'أبين',
    bachelorTotal: 10,
    bachelorDistribution: [
      { country: 'الجزائر', count: 5 },
      { country: 'المجر', count: 3 },
      { country: 'الأردن', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الجزائر', count: 1 }],
  },
  {
    id: 4,
    name: 'تعز',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الأردن', count: 6 },
      { country: 'المغرب', count: 4 },
      { country: 'المجر', count: 3 },
      { country: 'الصين', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [{ country: 'الصين', count: 2 }],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'المغرب', count: 1 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 5,
    name: 'إب',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الأردن', count: 5 },
      { country: 'المجر', count: 4 },
      { country: 'كوبا', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'الصين', count: 1 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 4,
    medicineDistribution: [
      { country: 'كوبا', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 6,
    name: 'حضرموت',
    bachelorTotal: 16,
    bachelorDistribution: [
      { country: 'المجر', count: 5 },
      { country: 'الأردن', count: 4 },
      { country: 'المغرب', count: 4 },
      { country: 'الجزائر', count: 2 },
      { country: 'الصين', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 4,
    masterDistribution: [
      { country: 'المجر', count: 3 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الجزائر', count: 1 }],
  },
  {
    id: 7,
    name: 'مأرب',
    bachelorTotal: 8,
    bachelorDistribution: [
      { country: 'الأردن', count: 3 },
      { country: 'المغرب', count: 2 },
      { country: 'المجر', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الجزائر', count: 1 }],
  },
  {
    id: 8,
    name: 'شبوة',
    bachelorTotal: 13,
    bachelorDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'الجزائر', count: 3 },
      { country: 'المجر', count: 3 },
      { country: 'المغرب', count: 2 },
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 3,
    masterDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 3,
    medicineDistribution: [
      { country: 'الأردن', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 1 },
    ],
  },
  {
    id: 9,
    name: 'الضالع',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الجزائر', count: 5 },
      { country: 'المجر', count: 4 },
      { country: 'المغرب', count: 3 },
      { country: 'الأردن', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 3,
    masterDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 4,
    medicineDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'كوبا', count: 1 },
    ],
  },
  {
    id: 10,
    name: 'المهرة',
    bachelorTotal: 4,
    bachelorDistribution: [
      { country: 'الأردن', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 1 },
      { country: 'PMU السعودية', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'المجر', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'كوبا', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 11,
    name: 'صنعاء',
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الجزائر', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'الصين', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'المجر', count: 1 }],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 12,
    name: 'أمانة العاصمة',
    bachelorTotal: 14,
    bachelorDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'المغرب', count: 4 },
      { country: 'الصين', count: 3 },
      { country: 'المجر', count: 2 },
      { country: 'الجزائر', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 2,
    masterDistribution: [
      { country: 'المجر', count: 1 },
      { country: 'الصين', count: 1 },
    ],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'المغرب', count: 1 },
      { country: 'الصين', count: 1 },
    ],
  },
  {
    id: 13,
    name: 'ذمار',
    bachelorTotal: 6,
    bachelorDistribution: [
      { country: 'الأردن', count: 3 },
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الأردن', count: 1 }],
  },
  {
    id: 14,
    name: 'عمران',
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الجزائر', count: 1 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الجزائر', count: 1 }],
  },
  {
    id: 15,
    name: 'حجة',
    bachelorTotal: 9,
    bachelorDistribution: [
      { country: 'المغرب', count: 3 },
      { country: 'الجزائر', count: 2 },
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'PMU السعودية', count: 1 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 2,
    medicineDistribution: [
      { country: 'الجزائر', count: 1 },
      { country: 'المجر', count: 1 },
    ],
  },
  {
    id: 16,
    name: 'الحديدة',
    bachelorTotal: 8,
    bachelorDistribution: [
      { country: 'الأردن', count: 4 },
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 2 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 3,
    masterDistribution: [{ country: 'الصين', count: 3 }],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'المغرب', count: 1 }],
  },
  {
    id: 17,
    name: 'المحويت',
    bachelorTotal: 3,
    bachelorDistribution: [
      { country: 'الأردن', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'المجر', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'كوبا', count: 1 }],
  },
  {
    id: 18,
    name: 'ريمة',
    bachelorTotal: 3,
    bachelorDistribution: [
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'المجر', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'الجزائر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'كوبا', count: 1 }],
  },
  {
    id: 19,
    name: 'البيضاء',
    bachelorTotal: 1,
    bachelorDistribution: [
      { country: 'الجزائر', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الجزائر', count: 1 }],
  },
  {
    id: 20,
    name: 'الجوف',
    bachelorTotal: 4,
    bachelorDistribution: [
      { country: 'الجزائر', count: 2 },
      { country: 'المجر', count: 2 },
      { country: 'الأردن', count: 0 },
      { country: 'المغرب', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الجزائر', count: 1 }],
  },
  {
    id: 21,
    name: 'صعدة',
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 1 },
      { country: 'كوبا', count: 1 },
      { country: 'المجر', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 0,
    masterDistribution: [],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'كوبا', count: 1 }],
  },
  {
    id: 22,
    name: 'سقطرى',
    bachelorTotal: 3,
    bachelorDistribution: [
      { country: 'الجزائر', count: 2 },
      { country: 'المغرب', count: 1 },
      { country: 'الأردن', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'الصين', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الجزائر', count: 1 }],
  },
  {
    id: 23,
    name: 'فئة الخارج (أبناء المغتربين والدارسين بالخارج)',
    isSpecialCategory: true,
    bachelorTotal: 5,
    bachelorDistribution: [
      { country: 'المغرب', count: 2 },
      { country: 'الصين', count: 2 },
      { country: 'الأردن', count: 1 },
      { country: 'الجزائر', count: 0 },
      { country: 'كوبا', count: 0 },
      { country: 'المجر', count: 0 },
      { country: 'PMU السعودية', count: 0 },
    ],
    masterTotal: 1,
    masterDistribution: [{ country: 'الصين', count: 1 }],
    medicineTotal: 1,
    medicineDistribution: [{ country: 'الصين', count: 1 }],
  },
];

export function CulturalExchangeGovernoratesAccordion() {
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<'desc_seats' | 'official' | 'asc_seats'>('desc_seats');

  const toggleGov = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const expandAll = () => {
    setOpenIds(GOVERNORATES_2026_DATA.map((g) => g.id));
  };

  const collapseAll = () => {
    setOpenIds([]);
  };

  const filtered = useMemo(() => {
    const list = GOVERNORATES_2026_DATA.filter((g) =>
      g.name.includes(searchQuery.trim()),
    );

    return [...list].sort((a, b) => {
      if (a.isSpecialCategory && !b.isSpecialCategory) return 1;
      if (!a.isSpecialCategory && b.isSpecialCategory) return -1;

      if (sortMode === 'desc_seats') {
        const totalA = a.bachelorTotal + a.masterTotal;
        const totalB = b.bachelorTotal + b.masterTotal;
        if (totalB !== totalA) return totalB - totalA;
        if (b.bachelorTotal !== a.bachelorTotal) return b.bachelorTotal - a.bachelorTotal;
        return a.id - b.id;
      }
      if (sortMode === 'asc_seats') {
        const totalA = a.bachelorTotal + a.masterTotal;
        const totalB = b.bachelorTotal + b.masterTotal;
        if (totalA !== totalB) return totalA - totalB;
        return a.id - b.id;
      }
      return a.id - b.id;
    });
  }, [searchQuery, sortMode]);

  return (
    <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden flex flex-col shadow-2xs font-['Cairo',sans-serif]">
      {/* Intro & Clarification Banner */}
      <div className="px-3 sm:px-4 py-3 bg-[var(--mn-page)] border-b border-[var(--mn-border)] space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] shrink-0"
            />
            <span className="text-[12px] sm:text-[12.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-heading)]">
              بيانات جميع المحافظات (22 محافظة) + فئة الخارج لدورة 2026/2027 المدققة
            </span>
          </div>
          <span className="text-[11px] font-bold font-['Cairo',sans-serif] text-[#0E7C86] dark:text-[#21A7B4] shrink-0">
            23 بطاقة تفاعلية — انقر للتفاصيل
          </span>
        </div>

        <p className="text-[11.5px] sm:text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text)] leading-[1.85] text-justify">
          <span
            aria-hidden="true"
            className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0"
          />
          لكل محافظة نعرض في الشريط الخارجي إجمالي المقاعد والبكالوريوس والماجستير في خط مستقيم موحد، وعند فتح تفاصيل المحافظة يظهر توزيع الدول ومقاعد الطب البشري.{' '}
          <strong className="text-[var(--mn-heading)] font-bold">تنبيه جوهري:</strong> مقاعد الطب البشري محسوبة أصلًا ضمن إجمالي مقاعد البكالوريوس وليست مقاعد إضافية منفصلة.
        </p>
      </div>

      {/* Interactive Controls Bar: Search & Sort */}
      <div className="px-3 sm:px-4 py-2.5 bg-[var(--mn-surface)] border-b border-[var(--mn-border)] flex flex-col md:flex-row md:items-center justify-between gap-2 font-['Cairo',sans-serif]">
        {/* Search Input */}
        <div className="relative w-full md:max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن محافظة (مثال: عدن، تعز، حضرموت...)"
            className="w-full pr-8 pl-3 py-1.5 text-[11.5px] font-bold font-['Cairo',sans-serif] rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-text)] placeholder:text-[var(--mn-text-muted)] focus:outline-none focus:border-[#0E7C86] transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[var(--mn-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort and expand/collapse controls */}
        <div className="flex items-center flex-wrap gap-1.5 justify-between md:justify-end font-['Cairo',sans-serif]">
          <div className="flex items-center gap-1 bg-[var(--mn-page)] p-1 rounded-lg border border-[var(--mn-border)] text-[11px] font-bold font-['Cairo',sans-serif]">
            <button
              type="button"
              onClick={() => setSortMode('desc_seats')}
              className={`px-2 py-1 rounded font-bold transition-colors flex items-center gap-1 cursor-pointer text-[11px] font-['Cairo',sans-serif] ${
                sortMode === 'desc_seats'
                  ? 'bg-[#142B5F] text-white'
                  : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
              }`}
            >
              <ArrowDownNarrowWide className="w-3 h-3" />
              <span>الأكثر مقاعداً</span>
            </button>
            <button
              type="button"
              onClick={() => setSortMode('official')}
              className={`px-2 py-1 rounded font-bold transition-colors cursor-pointer text-[11px] font-['Cairo',sans-serif] ${
                sortMode === 'official'
                  ? 'bg-[#142B5F] text-white'
                  : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
              }`}
            >
              <span>الترتيب الرسمي</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1 rounded-md border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] text-[11px] font-bold font-['Cairo',sans-serif] text-[var(--mn-heading)] transition-colors cursor-pointer"
            >
              فتح الكل
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-md border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] text-[11px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)] transition-colors cursor-pointer"
            >
              طي الكل
            </button>
          </div>
        </div>
      </div>

      {/* Governorates List — aligned in a single straight line */}
      <div className="divide-y divide-[var(--mn-border)]">
        {filtered.length === 0 ? (
          <div className="p-5 text-center text-[11.5px] sm:text-[12px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)]">
            لا توجد محافظة تطابق بحثك
          </div>
        ) : (
          filtered.map((gov, index) => {
            const isOpen = openIds.includes(gov.id);
            const totalAll = gov.bachelorTotal + gov.masterTotal;
            const rankOrId = sortMode === 'desc_seats' ? index + 1 : gov.id;
            const shortDisplayName = gov.isSpecialCategory ? 'فئة الخارج' : gov.name;

            return (
              <div key={gov.id} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggleGov(gov.id)}
                  className={`w-full px-2.5 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer select-none font-['Cairo',sans-serif] ${
                    isOpen ? 'bg-[var(--mn-page)]' : 'hover:bg-[var(--mn-page)]/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
                    {/* Governorate Name Badge with uniform width so columns align in a straight line */}
                    <div className="w-[106px] sm:w-[132px] px-2 sm:px-2.5 py-1 rounded-lg bg-[#142B5F] text-white border border-[#142B5F] shadow-2xs flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10.5px] sm:text-[11px] font-bold opacity-85 shrink-0">
                        {gov.isSpecialCategory ? (
                          <PlaneTakeoff className="w-3 h-3 inline-block" />
                        ) : (
                          `${rankOrId}.`
                        )}
                      </span>
                      <span className="text-[11px] sm:text-[12px] font-bold font-['Cairo',sans-serif] truncate">
                        {shortDisplayName}
                      </span>
                    </div>

                    {/* 3 Aligned Stat Boxes in a Straight Line (Total, Bachelor, Master) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-[11.5px] font-bold font-['Cairo',sans-serif] shrink-0">
                      <span className="w-[70px] sm:w-[88px] inline-flex items-center justify-center px-1.5 sm:px-2 py-1 rounded-md font-bold bg-[var(--mn-page)] text-[var(--mn-heading)] border border-[var(--mn-border)] shrink-0">
                        <span className="font-mono ml-1 text-[#0E7C86] dark:text-[#21A7B4]">{totalAll}</span>
                        <span>الإجمالي</span>
                      </span>

                      <span className="w-[76px] sm:w-[94px] inline-flex items-center justify-center px-1.5 sm:px-2 py-1 rounded-md font-bold bg-[var(--mn-page)] text-[var(--mn-text)] border border-[var(--mn-border)] shrink-0">
                        <span className="font-mono ml-1 text-[var(--mn-heading)]">{gov.bachelorTotal}</span>
                        <span>بكالوريوس</span>
                      </span>

                      <span className="w-[68px] sm:w-[86px] inline-flex items-center justify-center px-1.5 sm:px-2 py-1 rounded-md font-bold bg-[var(--mn-page)] text-[var(--mn-text)] border border-[var(--mn-border)] shrink-0">
                        <span className="font-mono ml-1 text-[var(--mn-heading)]">{gov.masterTotal}</span>
                        <span>ماجستير</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] hidden sm:inline">
                      {isOpen ? 'إخفاء' : 'التفاصيل'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#0E7C86]' : 'text-[var(--mn-text-muted)]'
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 sm:px-4 pb-3.5 pt-2.5 bg-[var(--mn-page)] border-t border-[var(--mn-border)]/70 space-y-2.5 font-['Cairo',sans-serif]">
                    {gov.isSpecialCategory && (
                      <div className="text-[11.5px] font-bold text-[var(--mn-heading)]">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] ml-1.5 align-middle" />
                        {gov.name}
                      </div>
                    )}

                    {/* بطاقة توزيع مقاعد البكالوريوس */}
                    <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2">
                      <h6 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center gap-1.5 pb-1.5 border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                        <GraduationCap className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                        <span>توزيع مقاعد البكالوريوس ({gov.bachelorTotal} مقعداً):</span>
                      </h6>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {gov.bachelorDistribution.map((item, idx) => (
                          <div
                            key={idx}
                            className={`px-2.5 py-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] flex items-center justify-between gap-1.5 text-[11px] sm:text-[11.5px] font-bold font-['Cairo',sans-serif] ${
                              item.count > 0 ? '' : 'opacity-45'
                            }`}
                          >
                            <span className="font-bold text-[var(--mn-heading)] truncate">
                              {item.country}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-bold shrink-0 ${
                                item.count > 0
                                  ? 'text-[#0E7C86] dark:text-[#21A7B4]'
                                  : 'text-[var(--mn-text-muted)]'
                              }`}
                            >
                              {item.count} {item.count === 1 ? 'مقعد' : item.count === 2 ? 'مقعدان' : 'مقاعد'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* بطاقتان متوازنتان للماجستير والطب البشري */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch font-['Cairo',sans-serif]">
                      <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs h-full flex flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <h6 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center gap-1.5 pb-1.5 border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                            <BriefcaseBusiness className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                            <span>مقاعد الماجستير ({gov.masterTotal} {gov.masterTotal === 1 ? 'مقعد' : gov.masterTotal === 2 ? 'مقعدان' : 'مقاعد'}):</span>
                          </h6>
                          {gov.masterDistribution.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-0.5 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-heading)]">
                              {gov.masterDistribution.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                                  <span>{m.country}:</span>
                                  <span className="font-mono text-[#0E7C86] dark:text-[#21A7B4]">{m.count}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] pt-0.5">
                              لا توجد مقاعد ماجستير مخصصة في هذه الدورة.
                            </p>
                          )}
                        </div>
                        <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] pt-1.5 border-t border-[var(--mn-border)]/70">
                          مقاعد الدراسات العليا مستقلة عن حصة البكالوريوس.
                        </p>
                      </div>

                      <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs h-full flex flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <h6 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center gap-1.5 pb-1.5 border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                            <Stethoscope className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                            <span>توزيع الطب البشري ({gov.medicineTotal} {gov.medicineTotal === 1 ? 'مقعد' : gov.medicineTotal === 2 ? 'مقعدان' : 'مقاعد'}):</span>
                          </h6>
                          {gov.medicineDistribution.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-0.5 text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-heading)]">
                              {gov.medicineDistribution.map((med, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                                  <span>{med.country}:</span>
                                  <span className="font-mono text-[#0E7C86] dark:text-[#21A7B4]">{med.count}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11.5px] font-bold font-['Cairo',sans-serif] text-[var(--mn-text-muted)] pt-0.5">
                              لا توجد مقاعد طب بشري مخصصة في هذه الدورة.
                            </p>
                          )}
                        </div>
                        <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] pt-1.5 border-t border-[var(--mn-border)]/70">
                          مقاعد الطب البشري ({gov.medicineTotal}) محسوبة ضمن مقاعد البكالوريوس ({gov.bachelorTotal}).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
