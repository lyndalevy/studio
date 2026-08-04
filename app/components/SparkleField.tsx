import { Sparkle } from "./Marks";

/**
 * Scattered twinkling sparkles for section backgrounds — the same mark as the
 * footer divider, spread out and drifting in and out.
 *
 * Positions and timings are hard-coded rather than random so the server and
 * the browser always render the same thing (random values would cause a
 * hydration mismatch). Purely decorative, so it's hidden from screen readers
 * and sits behind content with no pointer interaction.
 */

type Spark = { top: string; left: string; size: string; delay: string; duration: string };

// Kept out of the middle of the page, where the headline and body text sit,
// so nothing ever twinkles on top of a word.
const SPARKS: Spark[] = [
  { top: "9%", left: "5%", size: "2.4rem", delay: "0s", duration: "3.2s" },
  { top: "20%", left: "89%", size: "3.2rem", delay: "0.8s", duration: "4.1s" },
  { top: "36%", left: "13%", size: "1.5rem", delay: "1.6s", duration: "2.8s" },
  { top: "6%", left: "22%", size: "1.2rem", delay: "2.2s", duration: "3.6s" },
  { top: "58%", left: "4%", size: "2rem", delay: "0.4s", duration: "3.9s" },
  { top: "72%", left: "84%", size: "2.8rem", delay: "1.1s", duration: "3.1s" },
  { top: "46%", left: "95%", size: "1.4rem", delay: "2.6s", duration: "4.4s" },
  { top: "84%", left: "14%", size: "1.8rem", delay: "1.9s", duration: "3.4s" },
  { top: "12%", left: "76%", size: "1.1rem", delay: "0.6s", duration: "2.6s" },
  { top: "88%", left: "68%", size: "2.2rem", delay: "2.9s", duration: "4.0s" },
  { top: "78%", left: "34%", size: "1rem", delay: "1.4s", duration: "3.7s" },
  { top: "30%", left: "80%", size: "1.6rem", delay: "3.3s", duration: "3.0s" },
];

export default function SparkleField({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {SPARKS.map((s, i) => (
        <Sparkle
          key={i}
          className="absolute text-red"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: 0.22,
            animation: `twinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
