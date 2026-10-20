type MarkProps = { className?: string };

/** Instagram glyph, drawn to sit alongside the brand's line weights. */
export function Instagram({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none">
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.6" cy="6.4" r="1.4" fill="currentColor" />
    </svg>
  );
}
