import type { CSSProperties } from "react";

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

/** The four-point sparkle from the logo's round "L" mark. */
export function Sparkle({ className, style }: MarkProps & { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" fill="currentColor">
      <path d="M12 0Q14.2 9.8 24 12Q14.2 14.2 12 24Q9.8 14.2 0 12Q9.8 9.8 12 0Z" />
    </svg>
  );
}
