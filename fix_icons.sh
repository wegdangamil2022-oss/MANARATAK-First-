#!/bin/bash
# 1. Dot bullets (bg-[var(--mn-primary)])
sed -i 's/bg-\[var(--mn-primary)\] shrink-0/bg-[var(--mn-primary)] mn-dark:bg-[var(--mn-accent)] shrink-0/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx
sed -i 's/bg-\[var(--mn-primary)\] group-hover:bg-\[var(--mn-accent)\] shrink-0/bg-[var(--mn-primary)] mn-dark:bg-[var(--mn-accent)] group-hover:bg-[var(--mn-accent)] mn-dark:group-hover:bg-[var(--mn-primary)] shrink-0/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx

# 2. Tracks borders (bg-[var(--mn-primary)]/80)
sed -i 's/w-1 bg-\[var(--mn-primary)\]\/80 group-hover:bg-\[var(--mn-primary)\]/w-1 bg-[var(--mn-primary)]\/80 mn-dark:bg-[var(--mn-accent)]\/80 group-hover:bg-[var(--mn-primary)] mn-dark:group-hover:bg-[var(--mn-accent)]/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx

sed -i 's/w-1\.5 bg-\[var(--mn-primary)\]\/80 group-hover:bg-\[var(--mn-primary)\]/w-1.5 bg-[var(--mn-primary)]\/80 mn-dark:bg-[var(--mn-accent)]\/80 group-hover:bg-[var(--mn-primary)] mn-dark:group-hover:bg-[var(--mn-accent)]/g' apps/web/src/features/public-template/components/modal/FellowshipDetailView.tsx

# 3. CheckCircle2 container
sed -i 's/bg-\[var(--mn-primary)\]\/10 text-\[var(--mn-heading)\] flex items-center justify-center shrink-0 mt-0.5/bg-[var(--mn-primary)]\/10 text-[var(--mn-primary)] mn-dark:bg-[var(--mn-accent)]\/15 mn-dark:text-[var(--mn-accent)] flex items-center justify-center shrink-0 mt-0.5/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx
sed -i 's/group-hover:bg-\[var(--mn-primary)\] group-hover:text-white/group-hover:bg-[var(--mn-primary)] group-hover:text-white mn-dark:group-hover:bg-[var(--mn-accent)] mn-dark:group-hover:text-[var(--mn-primary)]/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx

# 4. ShieldCheck text color
sed -i 's/ShieldCheck className="w-3.5 h-3.5 text-\[var(--mn-heading)\]/ShieldCheck className="w-3.5 h-3.5 text-[var(--mn-primary)] mn-dark:text-[var(--mn-accent)]/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx

# 5. Building text color
sed -i 's/Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-\[var(--mn-heading)\]/Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-primary)] mn-dark:text-[var(--mn-accent)]/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx

# 6. Some other items:
# e.g., <div className="w-1.5 h-1.5 bg-[var(--mn-primary)]/80 rounded-sm shrink-0 group-hover:scale-110 group-hover:bg-[var(--mn-primary)] transition-all rotate-45 mt-1.5 " />
sed -i 's/w-1\.5 h-1\.5 bg-\[var(--mn-primary)\]\/80 rounded-sm shrink-0 group-hover:scale-110 group-hover:bg-\[var(--mn-primary)\]/w-1.5 h-1.5 bg-[var(--mn-primary)]\/80 mn-dark:bg-[var(--mn-accent)]\/80 rounded-sm shrink-0 group-hover:scale-110 group-hover:bg-[var(--mn-primary)] mn-dark:group-hover:bg-[var(--mn-accent)]/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx

# e.g., <div className="w-2 h-[2.5px] bg-[var(--mn-primary)]/80 group-hover:bg-[var(--mn-primary)] group-hover:w-3.5 transition-all duration-300 shrink-0 mt-1.5 rounded-full " />
sed -i 's/w-2 h-\[2\.5px\] bg-\[var(--mn-primary)\]\/80 group-hover:bg-\[var(--mn-primary)\] group-hover:w-3\.5/w-2 h-[2.5px] bg-[var(--mn-primary)]\/80 mn-dark:bg-[var(--mn-accent)]\/80 group-hover:bg-[var(--mn-primary)] mn-dark:group-hover:bg-[var(--mn-accent)] group-hover:w-3.5/g' apps/web/src/features/public-template/components/MajorDetailModal.tsx

# FellowshipDetailView dots
sed -i 's/w-1\.5 h-1\.5 sm:w-2 sm:h-2 rounded-full bg-\[var(--mn-primary)\] group-hover:bg-\[var(--mn-accent)\] shrink-0/w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--mn-primary)] mn-dark:bg-[var(--mn-accent)] group-hover:bg-[var(--mn-accent)] mn-dark:group-hover:bg-[var(--mn-primary)] shrink-0/g' apps/web/src/features/public-template/components/modal/FellowshipDetailView.tsx

