import { useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  photos: string[];
  raceName: string;
}

export function PhotoCarousel({ photos, raceName }: Props) {
  const [active, setActive] = useState(0);
  if (!photos || photos.length === 0) return null;

  const safe = photos.slice(0, 20);
  const current = safe[active];
  const prev = () => setActive((i) => (i - 1 + safe.length) % safe.length);
  const next = () => setActive((i) => (i + 1) % safe.length);

  return (
    <section data-testid="section-photo-carousel">
      <h2 className="font-heading font-bold text-2xl mb-4 flex items-center gap-2 border-l-4 border-rose-500 pl-3">
        <ImageIcon className="h-5 w-5" />
        Course preview
      </h2>
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="relative bg-muted aspect-[16/9]">
          <img
            src={current}
            alt={`${raceName} — photo ${active + 1} of ${safe.length}`}
            className="w-full h-full object-cover"
            loading="lazy"
            data-testid={`img-photo-${active}`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          {safe.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full shadow"
                onClick={prev}
                aria-label="Previous photo"
                data-testid="button-photo-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full shadow"
                onClick={next}
                aria-label="Next photo"
                data-testid="button-photo-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded" data-testid="text-photo-counter">
                {active + 1} / {safe.length}
              </div>
            </>
          )}
        </div>
        {safe.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-muted/30">
            {safe.map((url, i) => (
              <button
                key={url + i}
                type="button"
                onClick={() => setActive(i)}
                className={`shrink-0 rounded overflow-hidden border-2 transition-colors ${
                  i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                }`}
                aria-label={`Show photo ${i + 1}`}
                data-testid={`button-photo-thumb-${i}`}
              >
                <img
                  src={url}
                  alt=""
                  className="w-20 h-14 object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLButtonElement).style.display = "none";
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
