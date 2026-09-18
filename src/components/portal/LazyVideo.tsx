"use client";

interface LazyVideoProps {
  src: string;
  className?: string;
}

// Video wird nie automatisch geladen/abgespielt — preload="metadata" zeigt
// nur das erste Frame als Poster, echte Daten laden erst bei Klick auf Play.
export function LazyVideo({ src, className = "" }: LazyVideoProps) {
  return (
    <video
      src={src}
      controls
      preload="metadata"
      playsInline
      className={`w-full h-full object-cover bg-black ${className}`}
    />
  );
}
