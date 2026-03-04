type ProgressRingProps = {
  completed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

const MIN_TARGET = 1;

export default function ProgressRing({
  completed,
  target,
  size = 56,
  strokeWidth = 6,
  label,
}: ProgressRingProps) {
  const safeTarget = Math.max(target, MIN_TARGET);
  const boundedCompleted = Math.min(Math.max(completed, 0), safeTarget);
  const progress = boundedCompleted / safeTarget;
  const percentage = Math.round(progress * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label || `${percentage}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="text-ink transition-all duration-300"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold text-ink">
        {percentage}
      </span>
    </div>
  );
}
