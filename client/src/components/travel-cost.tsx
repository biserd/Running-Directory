import { useState } from "react";
import { Car, Plane, Home as HomeIcon, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  estimateTravel,
  haversineMiles,
  useHomeLocation,
  type HomeLocation,
} from "@/hooks/use-home-location";
import { apiGeocodeZip } from "@/lib/api";

interface Props {
  destination: { lat: number; lng: number } | null;
  destinationLabel: string;
}

export function TravelCost({ destination, destinationLabel }: Props) {
  const { home, set, clear } = useHomeLocation();
  const [editing, setEditing] = useState(false);
  const [zip, setZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5-digit US ZIP");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const loc = await apiGeocodeZip(zip);
      const value: HomeLocation = { zip, ...loc };
      set(value);
      setEditing(false);
      setZip("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't look up that ZIP");
    } finally {
      setSubmitting(false);
    }
  };

  if (!destination) {
    return null;
  }

  return (
    <div
      className="rounded-lg border bg-muted/30 p-4 mt-3"
      data-testid="card-travel-cost"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <HomeIcon className="h-4 w-4 text-primary" />
          Travel from home
        </div>
        {home && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            data-testid="button-edit-home"
          >
            <Pencil className="h-3 w-3" /> Change
          </button>
        )}
      </div>

      {!home || editing ? (
        <form onSubmit={onSubmit} className="space-y-2" data-testid="form-set-home">
          <p className="text-xs text-muted-foreground">
            Enter your home ZIP and we'll estimate driving / flight cost to the race.
          </p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder="ZIP code"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="h-9 text-sm"
              data-testid="input-home-zip"
            />
            <Button
              type="submit"
              size="sm"
              disabled={submitting || zip.length !== 5}
              data-testid="button-save-home"
            >
              {submitting ? "…" : <Check className="h-4 w-4" />}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setZip("");
                  setError(null);
                }}
                data-testid="button-cancel-home"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {error && (
            <p className="text-xs text-destructive" data-testid="text-home-error">
              {error}
            </p>
          )}
        </form>
      ) : (
        <TravelEstimateView home={home} destination={destination} destinationLabel={destinationLabel} onClear={clear} />
      )}
    </div>
  );
}

function TravelEstimateView({
  home,
  destination,
  destinationLabel,
  onClear,
}: {
  home: HomeLocation;
  destination: { lat: number; lng: number };
  destinationLabel: string;
  onClear: () => void;
}) {
  const miles = haversineMiles(home, destination);
  const est = estimateTravel(miles);
  const Icon = est.mode === "drive" ? Car : Plane;
  const hoursLabel =
    est.hours < 1
      ? `${Math.round(est.hours * 60)} min`
      : est.hours < 10
        ? `${est.hours.toFixed(1)} hr`
        : `${Math.round(est.hours)} hr`;

  return (
    <div className="space-y-3" data-testid="view-travel-estimate">
      <div className="text-xs text-muted-foreground">
        From <span className="font-medium text-foreground" data-testid="text-home-label">{home.label}</span> ({home.zip}) →{" "}
        <span className="font-medium text-foreground">{destinationLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold capitalize" data-testid="text-travel-mode">
            {est.mode === "drive" ? "Drive" : "Fly"} · ~{Math.round(miles).toLocaleString()} mi
          </div>
          <div className="text-xs text-muted-foreground">
            <span data-testid="text-travel-hours">{hoursLabel}</span> ·{" "}
            <span data-testid="text-travel-cost">~${Math.round(est.cost).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/70 leading-snug">
        Estimate: $0.20/mi to drive, $75 + $0.10/mi over 300mi to fly. One-way per traveler.{" "}
        <button
          type="button"
          onClick={onClear}
          className="underline hover:text-foreground"
          data-testid="button-clear-home"
        >
          Forget my home
        </button>
      </p>
    </div>
  );
}
