import { LazyVideo } from "./LazyVideo";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

export function MediaViewer({ items }: { items: MediaItem[] }) {
  if (items.length === 0) {
    return (
      <div className="video-frame w-full max-w-[300px] mx-auto rounded-md bg-ink-800 flex items-center justify-center text-ink-500 text-sm">
        Kein Medium
      </div>
    );
  }

  if (items.length === 1 && items[0]) {
    const item = items[0];
    return (
      <div className="video-frame w-full max-w-[300px] mx-auto rounded-md overflow-hidden">
        {item.type === "video" ? (
          <LazyVideo src={item.url} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-md -mx-1 px-1">
      {items.map((item, i) => (
        <div
          key={i}
          className="video-frame flex-none w-[220px] snap-center rounded-md overflow-hidden"
        >
          {item.type === "video" ? (
            <LazyVideo src={item.url} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}
