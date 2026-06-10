import React from 'react';

interface ContextSectionProps {
  content: string;
  label?: string;
}

export const ContextSection: React.FC<ContextSectionProps> = ({
  content,
  label = "CONTEXTE THÉOLOGIQUE"
}) => {
  if (!content) return null;

  return (
    <div className="w-full mt-6 pt-5 border-t border-luxury-border">
      {/* Label "CONTEXTE" upper, regular spacing, Colors.gold */}
      <h5 className="font-mono text-[11px] font-extrabold tracking-[0.15em] text-luxury-gold uppercase mb-3">
        {label}
      </h5>
      
      {/* Body text on luxury text primary, size 14px */}
      <p className="font-sans text-[14px] leading-relaxed text-luxury-text-primary/95 whitespace-pre-line select-text">
        {content}
      </p>
    </div>
  );
};
