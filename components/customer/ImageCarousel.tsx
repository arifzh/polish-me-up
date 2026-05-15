"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Auto-sliding image carousel for product cards.
 *  - Cross-fades between photos every `intervalMs`
 *  - Pauses while the cursor hovers the card
 *  - Renders pagination dots that the user can click to jump
 *  - Hides the dots if there's only one image (falls back to a static photo)
 */
export function ImageCarousel({
  images,
  alt,
  className = "",
  intervalMs = 3500,
}: {
  images: string[];
  alt: string;
  className?: string;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const valid = (images ?? []).filter(Boolean);

  useEffect(() => {
    if (valid.length < 2 || paused) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % valid.length);
    }, intervalMs);
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
    };
  }, [valid.length, paused, intervalMs]);

  if (valid.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {valid.map((src, i) => (
        <Image
          key={`${src}-${i}`}
          src={src}
          alt={`${alt} ${i + 1}`}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 768px) 33vw, 100vw"
          className={`absolute inset-0 object-cover transition-opacity duration-700 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          unoptimized
          priority={i === 0}
        />
      ))}

      {valid.length > 1 && (
        <div className="absolute right-0 bottom-2 left-0 flex justify-center gap-1.5">
          {valid.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIndex(i);
              }}
              aria-label={`Show image ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-white"
                  : "w-1.5 bg-white/60 hover:bg-white/90"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
