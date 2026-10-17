import React, { useEffect, useState } from 'react';

/**
 * AnimatedNumber smoothly interpolates between numbers with easing.
 */
export const AnimatedNumber: React.FC<{
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}> = ({ value, duration = 400, formatter = (n) => Math.round(n).toString(), className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startVal = displayValue;
    const diff = value - startVal;

    if (Math.abs(diff) < 0.01) {
      setDisplayValue(value);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startVal + diff * ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  return <span className={className}>{formatter(displayValue)}</span>;
};

/**
 * Circular progress ring with pastel styling, animated fill, and custom stroke.
 */
export const CircularProgressRing: React.FC<{
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  bgStrokeColor?: string;
  children?: React.ReactNode;
}> = ({
  progress,
  size = 110,
  strokeWidth = 9,
  colorClass = 'text-primary-500',
  bgStrokeColor = 'stroke-slate-200 dark:stroke-slate-800',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background track */}
        <circle
          className={bgStrokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Animated fill track */}
        <circle
          className={`${colorClass} transition-all duration-700 ease-out`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
};

/**
 * Animated Live Status Indicator
 */
export const LiveStatusBadge: React.FC<{
  isActive: boolean;
  activeText?: string;
  idleText?: string;
}> = ({ isActive, activeText = 'در حال کار', idleText = 'عدم حضور' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isActive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isActive ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
          }`}
        ></span>
      </span>
      <span>{isActive ? activeText : idleText}</span>
    </div>
  );
};
