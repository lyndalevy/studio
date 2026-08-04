/**
 * Brand marks from the style guide, redrawn as SVG so they stay sharp at any
 * size and pick up whatever colour their parent sets (they use currentColor).
 */

type MarkProps = { className?: string; style?: React.CSSProperties };

/** One four-pointed sparkle with concave sides. */
function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const k = r * 0.28; // how far the waist pinches in
  return (
    <path
      d={`M ${cx} ${cy - r}
          Q ${cx + k} ${cy - k} ${cx + r} ${cy}
          Q ${cx + k} ${cy + k} ${cx} ${cy + r}
          Q ${cx - k} ${cy + k} ${cx - r} ${cy}
          Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z`}
      fill="currentColor"
    />
  );
}

/** The three-sparkle cluster used as a section divider. */
export function Sparkles({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 100 74" className={className} aria-hidden="true">
      <g className="twinkle">
        <Star cx={52} cy={26} r={24} />
      </g>
      <g className="twinkle-slow">
        <Star cx={22} cy={56} r={13} />
      </g>
      <g className="twinkle" style={{ animationDelay: "1.1s" }}>
        <Star cx={74} cy={58} r={9} />
      </g>
    </svg>
  );
}

/** A single sparkle, for inline accents. */
export function Sparkle({ className, style }: MarkProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <Star cx={20} cy={20} r={18} />
    </svg>
  );
}

export function Camera({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden="true">
      <path
        d="M14 26h16l8-10h30l8 10h16a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10H14A10 10 0 0 1 4 76V36a10 10 0 0 1 10-10Z"
        fill="currentColor"
      />
      <circle cx="60" cy="56" r="21" fill="var(--color-cream)" />
      <path
        d="M60 41a15 15 0 1 0 15 15 11 11 0 1 1-15-15Z"
        fill="currentColor"
      />
      <rect x="16" y="33" width="16" height="5" rx="1.5" fill="var(--color-cream)" />
      <rect x="86" y="18" width="14" height="8" rx="2" fill="currentColor" />
    </svg>
  );
}

export function FilmReel({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden="true">
      <path
        d="M96 62c8 4 14 9 20 18"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="54" cy="46" r="42" fill="currentColor" />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <circle
            key={deg}
            cx={54 + Math.cos(rad) * 24}
            cy={46 + Math.sin(rad) * 24}
            r="9"
            fill="var(--color-cream)"
          />
        );
      })}
    </svg>
  );
}

export function Polaroids({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 120 110" className={className} aria-hidden="true">
      <g transform="rotate(-16 60 58)">
        <rect x="8" y="26" width="46" height="54" fill="currentColor" />
        <rect x="13" y="31" width="36" height="34" fill="var(--color-cream)" />
      </g>
      <g transform="rotate(15 60 58)">
        <rect x="66" y="26" width="46" height="54" fill="currentColor" />
        <rect x="71" y="31" width="36" height="34" fill="var(--color-cream)" />
      </g>
      <rect x="38" y="18" width="46" height="58" fill="currentColor" />
      <rect x="43" y="23" width="36" height="36" fill="var(--color-cream)" />
    </svg>
  );
}

/** The L-with-sparkles roundel. Used as a small standalone badge. */
export function Roundel({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill="currentColor" />
      <g fill="var(--color-cream)">
        <path d="M24 26h26v5h-6v38h18v-9h5v14H24v-5h6V31h-6z" />
        <g transform="translate(4 0)">
          <Star cx={66} cy={40} r={14} />
          <Star cx={50} cy={57} r={7} />
          <Star cx={78} cy={60} r={6} />
        </g>
      </g>
    </svg>
  );
}

/**
 * A horizontal divider: sprocket band, sparkles, sprocket band.
 * The piece that separates sections all over the site.
 */
export function Divider({ className }: MarkProps) {
  return (
    <div className={`flex items-center gap-5 ${className ?? ""}`} aria-hidden="true">
      <div className="h-0.5 flex-1 bg-red" />
      <Sparkles className="h-9 w-12 shrink-0 text-red" />
      <div className="h-0.5 flex-1 bg-red" />
    </div>
  );
}
