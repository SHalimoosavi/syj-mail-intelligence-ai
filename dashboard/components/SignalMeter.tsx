interface SignalMeterProps {
  value: number; // 0-100
  size?: "sm" | "md";
  label?: string;
}

const TICK_COUNT = 20;

function colorFor(value: number): string {
  if (value >= 85) return "#D6524A"; // critical
  if (value >= 60) return "#E8A33D"; // signal amber
  if (value >= 30) return "#8A93A3"; // muted
  return "#3FA796"; // low/calm
}

/**
 * Renders a score as a row of ticks lighting up left-to-right, like a VU
 * meter or radar signal-strength indicator, rather than a rounded progress
 * bar. Used for importance scores and reply-confidence scores everywhere in
 * the dashboard so a score always reads the same way at a glance.
 */
export function SignalMeter({ value, size = "md", label }: SignalMeterProps) {
  const litCount = Math.round((Math.max(0, Math.min(100, value)) / 100) * TICK_COUNT);
  const color = colorFor(value);
  const tickHeight = size === "sm" ? "h-2.5" : "h-3.5";
  const tickWidth = size === "sm" ? "w-[3px]" : "w-1";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-[2px]" aria-hidden="true">
        {Array.from({ length: TICK_COUNT }).map((_, i) => {
          const lit = i < litCount;
          const heightScale = 0.5 + (i / TICK_COUNT) * 0.5; // ticks grow taller toward the right
          return (
            <span
              key={i}
              className={`${tickWidth} ${tickHeight} rounded-[1px] transition-colors`}
              style={{
                backgroundColor: lit ? color : "#232B36",
                transform: `scaleY(${heightScale})`,
                transformOrigin: "bottom",
              }}
            />
          );
        })}
      </div>
      <span
        className="font-mono text-xs tabular-nums"
        style={{ color }}
        aria-label={label || `Score ${value} of 100`}
      >
        {value}
      </span>
    </div>
  );
}
