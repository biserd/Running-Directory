import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hotel, Plane, ShoppingBag, Users, ExternalLink } from "lucide-react";
import { buildOutboundRedirectUrl } from "@/lib/api";
import { TravelCost } from "@/components/travel-cost";

interface Props {
  raceId: number;
  raceName: string;
  city: string;
  state: string;
  date: string;
  distance: string;
  lat?: number | null;
  lng?: number | null;
}

export function PlanYourTrip({ raceId, raceName, city, state, date, distance, lat, lng }: Props) {
  const destination = encodeURIComponent(`${city}, ${state}`);

  // Affiliate-ready outbound URLs. Each goes through our tracked /api/outbound/redirect
  // so we capture click-through attribution for partner reporting later.
  const hotelUrl = buildOutboundRedirectUrl({
    url: `https://www.booking.com/searchresults.html?ss=${destination}&checkin=${date}`,
    destination: "hotel",
    raceId,
  });
  const flightUrl = buildOutboundRedirectUrl({
    url: `https://www.google.com/travel/flights?q=Flights%20to%20${destination}%20on%20${date}`,
    destination: "flight",
    raceId,
  });
  const gearUrl = buildOutboundRedirectUrl({
    url: `https://www.runningwarehouse.com/catpage-MFOOTWEAR.html?utm_source=runningservices&utm_campaign=race-${raceId}`,
    destination: "gear",
    raceId,
  });
  const coachUrl = buildOutboundRedirectUrl({
    url: `https://www.trainingpeaks.com/coach/?utm_source=runningservices&race=${raceId}&distance=${encodeURIComponent(distance)}`,
    destination: "coach",
    raceId,
  });

  return (
    <Card data-testid="card-plan-your-trip">
      <CardContent className="p-6">
        <h2 className="font-heading font-bold text-2xl mb-1 border-l-4 border-amber-500 pl-3">
          Plan your trip
        </h2>
        <p className="text-sm text-muted-foreground mb-5 pl-4">
          Everything you need to actually show up to {raceName} ready to run.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TripCard
            icon={<Hotel className="h-5 w-5" />}
            title="Find a hotel"
            sub={`Stays near ${city} for race weekend`}
            href={hotelUrl}
            testId="link-trip-hotel"
          />
          <TripCard
            icon={<Plane className="h-5 w-5" />}
            title="Book a flight"
            sub={`Flights to ${city}, ${state}`}
            href={flightUrl}
            testId="link-trip-flight"
          />
          <TripCard
            icon={<ShoppingBag className="h-5 w-5" />}
            title="Race-day gear"
            sub="Shoes, hydration, and apparel picks"
            href={gearUrl}
            testId="link-trip-gear"
          />
          <TripCard
            icon={<Users className="h-5 w-5" />}
            title={`Find a ${distance} coach`}
            sub="Get a training plan tuned for this race"
            href={coachUrl}
            testId="link-trip-coach"
          />
        </div>

        <TravelCost
          destination={lat != null && lng != null ? { lat, lng } : null}
          destinationLabel={`${city}, ${state}`}
        />

        <p className="text-xs text-muted-foreground mt-4 pl-4">
          We may earn a small commission from these partner links — it helps keep the race data free.
        </p>
      </CardContent>
    </Card>
  );
}

function TripCard({ icon, title, sub, href, testId }: { icon: React.ReactNode; title: string; sub: string; href: string; testId: string }) {
  return (
    <Button
      variant="outline"
      className="h-auto py-3 px-4 justify-start text-left"
      asChild
      data-testid={testId}
    >
      <a href={href} target="_blank" rel="noopener noreferrer nofollow sponsored">
        <span className="text-primary mr-3 shrink-0">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground truncate">{sub}</span>
        </span>
        <ExternalLink className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
      </a>
    </Button>
  );
}
