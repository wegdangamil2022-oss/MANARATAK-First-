import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { SCHOLARSHIPS_FAQ_ITEMS } from "../data/scholarshipsFaqData";

export function ScholarshipFaqSection() {
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleQuestion = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setOpenIds(SCHOLARSHIPS_FAQ_ITEMS.map((item) => item.id));
  };

  const collapseAll = () => {
    setOpenIds([]);
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return SCHOLARSHIPS_FAQ_ITEMS;
    const q = searchQuery.toLowerCase().trim();
    return SCHOLARSHIPS_FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        (item.example && item.example.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="relative w-full bg-[var(--mn-surface)] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[var(--mn-border)] shadow-xs space-y-3 text-right font-['Cairo',sans-serif]">
      {/* Top Accent Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-b border-[var(--mn-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 text-[#142B5F] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
            <HelpCircle className="w-3.5 h-3.5 text-[#D6A43B]" />
          </div>
          <div>
            <h3 className="text-[13px] sm:text-[13.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-tight">
              الأسئلة الشائعة عن المنح الدراسية
            </h3>
            <p className="text-[11px] font-bold text-[var(--mn-text-muted)] mt-0.5">
              إجابات موثوقة ومفصلة مع أمثلة واقعية على أهم ٤٠ سؤالاً يطرحها الطلاب حول التقديم، الأعمار، الشروط، والتخصصات.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Action Bar (Compact) */}
      <div className="p-2 sm:p-2.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--mn-text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الأسئلة أو الإجابات..."
            className="w-full pr-7 pl-2.5 py-1 text-[11.5px] font-bold rounded-md bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-text)] placeholder:text-[var(--mn-text-muted)] focus:outline-none focus:border-[#D6A43B] transition-colors"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <span className="text-[10.5px] font-bold text-[var(--mn-text-muted)] hidden md:inline-block ml-1">
            {filteredFaqs.length} سؤال
          </span>
          <button
            type="button"
            onClick={expandAll}
            className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#142B5F]/10 hover:bg-[#142B5F]/15 text-[#142B5F] dark:bg-[#F2CD78]/10 dark:text-[#F2CD78] border border-[#142B5F]/20 dark:border-[#F2CD78]/25 transition-colors cursor-pointer"
          >
            فتح الكل
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[var(--mn-surface-muted)] hover:bg-[var(--mn-border)] text-[var(--mn-text-muted)] border border-[var(--mn-border)] transition-colors cursor-pointer"
          >
            إغلاق الكل
          </button>
        </div>
      </div>

      {/* Questions Accordion List (Compact Refined Cards) */}
      <div className="space-y-1.5">
        {filteredFaqs.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <div
              key={faq.id}
              className={`rounded-lg bg-[var(--mn-page)] border transition-all overflow-hidden ${
                isOpen
                  ? "border-[#142B5F]/40 dark:border-[#F2CD78]/40 shadow-2xs"
                  : "border-[var(--mn-border)] hover:border-[#142B5F]/25"
              }`}
            >
              {/* Accordion Question Header Button */}
              <button
                type="button"
                onClick={() => toggleQuestion(faq.id)}
                className={`w-full px-2.5 py-2 sm:px-3 sm:py-2.5 flex items-center justify-between gap-2.5 text-right cursor-pointer transition-colors select-none ${
                  isOpen
                    ? "bg-[#142B5F]/5 dark:bg-[#F2CD78]/5"
                    : "hover:bg-[var(--mn-surface-muted)]/50"
                }`}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Navy Number Badge (المربع النيلي الصغير) */}
                  <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 font-bold font-mono text-[10.5px] bg-[#142B5F] text-white dark:bg-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/30 shadow-2xs">
                    {faq.id}
                  </span>

                  {/* Question Title */}
                  <h4 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-tight">
                    {faq.question}
                  </h4>
                </div>

                {/* Chevron Indicator */}
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-[#D6A43B]" : "text-[var(--mn-text-muted)]"
                  }`}
                />
              </button>

              {/* Accordion Answer Body */}
              {isOpen && (
                <div className="px-3 pb-2.5 pt-1.5 space-y-2 border-t border-[var(--mn-border)] bg-[var(--mn-surface)]/60">
                  {/* Answer Text */}
                  <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    {faq.answer}
                  </p>

                  {/* Example Box if available */}
                  {faq.example && (
                    <div className="mt-1 flex items-start gap-1.5 text-[11px] leading-[1.7] bg-[#142B5F]/5 dark:bg-[#F2CD78]/5 border border-[#142B5F]/15 dark:border-[#F2CD78]/20 rounded-md p-2 shadow-2xs">
                      <div className="flex items-center gap-1 shrink-0 text-[#D6A43B] dark:text-[#F2CD78] mt-0.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span className="font-bold text-[#142B5F] dark:text-[#F2CD78]">
                          مثال توضيحي:
                        </span>
                      </div>
                      <span className="font-bold text-[var(--mn-text)] text-justify">
                        {faq.example}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Important Golden Rule Card at the End of FAQ (Compact) */}
      <div className="rounded-lg bg-[#D6A43B]/10 dark:bg-[#D6A43B]/15 border border-[#D6A43B]/30 p-2.5 sm:p-3 space-y-1 text-right shadow-2xs">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#D6A43B] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <h4 className="text-[12px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
            قاعدة مهمة
          </h4>
        </div>
        <p className="text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
          لا تحاول حفظ قاعدة واحدة وتطبيقها على جميع المنح. قد تكون منحة مفتوحة لكل الأعمار تقريبًا وأخرى تضع حدًا للعمر، ومنحة تطلب IELTS وأخرى لا تطلبه، ومنحة تقبل جميع الجنسيات وأخرى تحدد دولًا معينة، ومنحة تسمح بالتقديم المباشر وأخرى تتطلب ترشيحًا رسميًا.
        </p>
        <p className="text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-[1.8] text-justify">
          لذلك الحكم دائمًا يكون من شروط المنحة في دورتها الحالية، وليس من تجربة طالب سابق أو منشور قديم على الإنترنت.
        </p>
      </div>
    </div>
  );
}

export default ScholarshipFaqSection;
