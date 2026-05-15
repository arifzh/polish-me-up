"use client";

import { useEffect, useMemo, useState } from "react";

type Spark = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  dx: number;
  color: string;
};

const PASTEL_COLORS = [
  "#FFD1DC",
  "#FFB7D5",
  "#F8BBD0",
  "#DB2777",
  "#FCE4EC",
  "#FFC2D8",
];

export function Sparkles({
  count = 22,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const sparks: Spark[] = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: 60 + Math.random() * 40, // start in the lower half
      size: 3 + Math.random() * 6,
      delay: Math.random() * 4,
      duration: 5 + Math.random() * 5,
      dx: (Math.random() - 0.5) * 80,
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
    }));
  }, [mounted, count]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {sparks.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
            animation: `pmu-sparkle-drift ${s.duration}s linear ${s.delay}s infinite`,
            ["--dx" as string]: `${s.dx}px`,
          }}
        />
      ))}
    </div>
  );
}
