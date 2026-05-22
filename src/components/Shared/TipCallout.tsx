import Banner from './Banner';
import React from 'react';

interface TipCalloutProps {
  children: React.ReactNode;
  className?: string;
}

export default function TipCallout({ children, className }: TipCalloutProps) {
  return (
    <Banner label="Tip" className={className}>
      {children}
    </Banner>
  );
}
