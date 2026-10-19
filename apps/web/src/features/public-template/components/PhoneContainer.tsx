import React from 'react';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[var(--ab-page)] w-full flex flex-col text-right selection:bg-[var(--ab-accent)]/30 ab-panel ">
      {children}
    </div>
  );
};
