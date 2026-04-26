import { useQuery } from "@tanstack/react-query";
import { apiGetSponsorships, type SponsorshipSlot as SponsorshipSlotData } from "@/lib/api";
import { Megaphone } from "lucide-react";

interface Props {
  placement: string;
  cityId?: number;
  stateId?: number;
  distance?: string;
  isTurkeyTrot?: boolean;
  limit?: number;
  className?: string;
}

export function SponsorshipSlot({ placement, cityId, stateId, distance, isTurkeyTrot, limit = 1, className = "" }: Props) {
  const queryKey = ["/api/sponsorships", placement, cityId, stateId, distance, isTurkeyTrot, limit];
  const { data } = useQuery<SponsorshipSlotData[]>({
    queryKey,
    queryFn: () => apiGetSponsorships({ placement, cityId, stateId, distance, isTurkeyTrot, limit }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!data || data.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`} data-testid={`sponsorship-slot-${placement}`}>
      {data.map((sp) => (
        <a
          key={sp.id}
          href={sp.clickUrl}
          target="_blank"
          rel="noopener sponsored"
          className="block border rounded-lg overflow-hidden bg-card hover:border-primary/40 transition-colors"
          data-testid={`sponsorship-${sp.id}`}
        >
          <div className="flex gap-4 p-4 items-center">
            {sp.imageUrl ? (
              <img
                src={sp.imageUrl}
                alt={sp.brand}
                className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Megaphone className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sponsored</span>
                <span className="text-xs text-muted-foreground">· {sp.brand}</span>
              </div>
              <p className="font-semibold text-sm leading-snug" data-testid={`sponsorship-headline-${sp.id}`}>{sp.headline}</p>
              {sp.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sp.body}</p>}
            </div>
            <div className="text-xs font-medium text-primary flex-shrink-0">{sp.ctaLabel} →</div>
          </div>
        </a>
      ))}
    </div>
  );
}
