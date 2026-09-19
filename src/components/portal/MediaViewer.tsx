"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { LazyVideo } from "./LazyVideo";
import { mediaAspectClass, type PostFormat } from "@/types/database";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

const ZOOM_SCALE = 2.5;
const SWIPE_THRESHOLD = 50;

function ChevronButton({
  direction,
  onClick,
  className = "",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={direction === "prev" ? "Vorheriges Medium" : "Nächstes Medium"}
      className={`h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-xl flex items-center justify-center transition-colors ${className}`}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}

function Lightbox({
  items,
  startIndex,
  onClose,
  onIndexChange,
}: {
  items: MediaItem[];
  startIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const imageIndexes = items.flatMap((item, i) => (item.type === "image" ? [i] : []));
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const frameRef = useRef<HTMLDivElement>(null);

  const position = imageIndexes.indexOf(index);
  const hasMultiple = imageIndexes.length > 1;

  const go = useCallback(
    (delta: number) => {
      const list = items.flatMap((item, i) => (item.type === "image" ? [i] : []));
      if (list.length < 2) return;
      const current = list.indexOf(index);
      const nextIndex = list[(current + delta + list.length) % list.length];
      if (nextIndex === undefined) return;
      setZoomed(false);
      setIndex(nextIndex);
      onIndexChange(nextIndex);
    },
    [items, index, onIndexChange]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  function updateOrigin(clientX: number, clientY: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  }

  function handleImageClick(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!zoomed) updateOrigin(e.clientX, e.clientY);
    setZoomed((z) => !z);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (zoomed) updateOrigin(e.clientX, e.clientY);
  }

  const current = items[index];
  if (!current || current.type !== "image") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bildansicht"
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
      >
        ×
      </button>

      {hasMultiple && (
        <>
          <ChevronButton direction="prev" onClick={() => go(-1)} className="absolute left-4 z-10" />
          <ChevronButton direction="next" onClick={() => go(1)} className="absolute right-4 z-10" />
          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {position + 1} / {imageIndexes.length}
          </span>
        </>
      )}

      <div
        ref={frameRef}
        onClick={handleImageClick}
        onPointerMove={handlePointerMove}
        className={`overflow-hidden ${zoomed ? "cursor-zoom-out touch-none" : "cursor-zoom-in"}`}
        style={{ maxWidth: "92vw", maxHeight: "90vh" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt=""
          draggable={false}
          className="block select-none"
          style={{
            maxWidth: "92vw",
            maxHeight: "90vh",
            objectFit: "contain",
            transform: zoomed ? `scale(${ZOOM_SCALE})` : "scale(1)",
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transition: "transform 150ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

export function MediaViewer({ items, format }: { items: MediaItem[]; format: PostFormat }) {
  const aspect = mediaAspectClass(format);
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const swiped = useRef(false);

  const last = items.length - 1;
  const goTo = (i: number) => setIndex(Math.min(last, Math.max(0, i)));

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  if (items.length === 0) {
    return (
      <div
        className={`${aspect} w-full max-w-[320px] mx-auto rounded-md bg-ink-800 flex items-center justify-center text-ink-500 text-sm`}
      >
        Kein Medium
      </div>
    );
  }

  function onTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    swiped.current = false;
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const dx = end - start;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      swiped.current = true;
      goTo(index + (dx < 0 ? 1 : -1));
    }
  }

  function openLightbox(i: number) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (items[i]?.type === "image") setLightboxIndex(i);
  }

  return (
    <div className="w-full max-w-[320px] mx-auto grid gap-2">
      <div
        className={`relative ${aspect} rounded-md overflow-hidden bg-black`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((item, i) => (
            <div key={i} className="h-full w-full flex-none">
              {item.type === "video" ? (
                <LazyVideo src={item.url} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  onClick={() => openLightbox(i)}
                  className="w-full h-full object-cover cursor-zoom-in select-none"
                />
              )}
            </div>
          ))}
        </div>

        {items.length > 1 && (
          <>
            {index > 0 && (
              <ChevronButton
                direction="prev"
                onClick={() => goTo(index - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2"
              />
            )}
            {index < last && (
              <ChevronButton
                direction="next"
                onClick={() => goTo(index + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            )}
            <span className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-xs px-2 py-0.5">
              {index + 1} / {items.length}
            </span>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Medium ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-5 bg-orange-500" : "w-2 bg-ink-600 hover:bg-ink-500"
              }`}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          startIndex={lightboxIndex}
          onClose={closeLightbox}
          onIndexChange={setIndex}
        />
      )}
    </div>
  );
}
