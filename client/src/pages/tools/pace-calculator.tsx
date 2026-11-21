import { useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KM_PER_MILE = 1.609344;
const distances = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half marathon", km: 21.0975 },
  { label: "Marathon", km: 42.195 },
];

function wholeNumber(value: string, maximum: number) {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number <= maximum ? number : null;
}

function clock(seconds: number, includeHours = false) {
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = includeHours ? Math.floor(rounded / 60) % 60 : Math.floor(rounded / 60);
  const remainder = String(rounded % 60).padStart(2, "0");
  return includeHours ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}` : `${minutes}:${remainder}`;
}

export function PaceCalculator() {
  const [mode, setMode] = useState<"pace" | "finish">("pace");
  const [unit, setUnit] = useState<"mi" | "km">("mi");
  const [preset, setPreset] = useState("Half marathon");
  const [customDistance, setCustomDistance] = useState("");
  const [finish, setFinish] = useState({ hours: "2", minutes: "00", seconds: "00" });
  const [pace, setPace] = useState({ minutes: "9", seconds: "00" });

  const distanceKm = preset === "custom"
    ? Number(customDistance) * (unit === "mi" ? KM_PER_MILE : 1)
    : distances.find(distance => distance.label === preset)?.km ?? 0;
  const validDistance = Number.isFinite(distanceKm) && distanceKm >= 0.1 && distanceKm <= 1000;
  const enteredTime = mode === "pace"
    ? [wholeNumber(finish.hours, 999), wholeNumber(finish.minutes, 59), wholeNumber(finish.seconds, 59)]
    : [0, wholeNumber(pace.minutes, 120), wholeNumber(pace.seconds, 59)];
  const [hours, minutes, seconds] = enteredTime;
  const inputSeconds = hours === null || minutes === null || seconds === null ? 0 : hours * 3600 + minutes * 60 + seconds;
  const valid = validDistance && inputSeconds > 0;
  const unitDistance = unit === "mi" ? distanceKm / KM_PER_MILE : distanceKm;
  const totalSeconds = mode === "pace" ? inputSeconds : inputSeconds * unitDistance;
  const pacePerKm = valid ? totalSeconds / distanceKm : 0;

  function changeUnit(nextUnit: "mi" | "km") {
    if (nextUnit === unit) return;
    if (preset === "custom" && customDistance && Number(customDistance) > 0) {
      setCustomDistance(String(Number((nextUnit === "km" ? distanceKm : distanceKm / KM_PER_MILE).toFixed(6))));
    }
    setUnit(nextUnit);
  }

  const fieldClass = "h-11 text-base tabular-nums";
  return (
    <section id="pace-calculator" className="scroll-mt-24" aria-labelledby="pace-heading" data-testid="card-tool-pace-calculator">
      <div className="mb-6 max-w-2xl">
        <h2 id="pace-heading" className="text-3xl font-bold sm:text-4xl">Running pace calculator</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Enter a goal finish time to get the pace you need, or enter the pace you can hold to estimate your finish time.
        </p>
      </div>
      <div className="grid overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5 p-5 sm:p-8">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Calculation">
            <button type="button" onClick={() => setMode("pace")} aria-pressed={mode === "pace"} className="rounded-lg border px-3 py-2 text-sm font-semibold aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary">Find my pace</button>
            <button type="button" onClick={() => setMode("finish")} aria-pressed={mode === "finish"} className="rounded-lg border px-3 py-2 text-sm font-semibold aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary">Find my finish time</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <div className="space-y-2">
              <Label htmlFor="calc-distance">Race distance</Label>
              <select id="calc-distance" value={preset} onChange={event => setPreset(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base">
                {distances.map(distance => <option key={distance.label}>{distance.label}</option>)}
                <option value="custom">Custom distance</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-units">Units</Label>
              <select id="calc-units" value={unit} onChange={event => changeUnit(event.target.value === "km" ? "km" : "mi")} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base">
                <option value="mi">Miles</option>
                <option value="km">Kilometers</option>
              </select>
            </div>
          </div>
          {preset === "custom" && (
            <div className="max-w-56 space-y-2">
              <Label htmlFor="calc-custom">Distance in {unit === "mi" ? "miles" : "kilometers"}</Label>
              <Input id="calc-custom" className={fieldClass} inputMode="decimal" type="number" min="0" step="any" value={customDistance} onChange={event => setCustomDistance(event.target.value)} />
            </div>
          )}
          {mode === "pace" ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Goal finish time</legend>
              <div className="grid max-w-xs grid-cols-3 gap-2">
                <div><Label htmlFor="finish-hours" className="mb-1 text-xs text-muted-foreground">Hours</Label><Input id="finish-hours" className={fieldClass} type="number" inputMode="numeric" min={0} max={999} value={finish.hours} onChange={event => setFinish({ ...finish, hours: event.target.value })} /></div>
                <div><Label htmlFor="finish-minutes" className="mb-1 text-xs text-muted-foreground">Minutes</Label><Input id="finish-minutes" className={fieldClass} type="number" inputMode="numeric" min={0} max={59} value={finish.minutes} onChange={event => setFinish({ ...finish, minutes: event.target.value })} /></div>
                <div><Label htmlFor="finish-seconds" className="mb-1 text-xs text-muted-foreground">Seconds</Label><Input id="finish-seconds" className={fieldClass} type="number" inputMode="numeric" min={0} max={59} value={finish.seconds} onChange={event => setFinish({ ...finish, seconds: event.target.value })} /></div>
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Pace per {unit === "mi" ? "mile" : "kilometer"}</legend>
              <div className="grid max-w-56 grid-cols-2 gap-2">
                <div><Label htmlFor="pace-minutes" className="mb-1 text-xs text-muted-foreground">Minutes</Label><Input id="pace-minutes" className={fieldClass} type="number" inputMode="numeric" min={0} max={120} value={pace.minutes} onChange={event => setPace({ ...pace, minutes: event.target.value })} /></div>
                <div><Label htmlFor="pace-seconds" className="mb-1 text-xs text-muted-foreground">Seconds</Label><Input id="pace-seconds" className={fieldClass} type="number" inputMode="numeric" min={0} max={59} value={pace.seconds} onChange={event => setPace({ ...pace, seconds: event.target.value })} /></div>
              </div>
            </fieldset>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center bg-slate-950 p-5 text-white sm:p-8">
          <Calculator className="mb-4 h-6 w-6 text-sky-300" aria-hidden="true" />
          <output aria-live="polite" aria-atomic="true" className="block">
            {valid ? (
              <>
                <span className="text-sm font-semibold text-sky-300">{mode === "pace" ? "Required average pace" : "Estimated finish time"}</span>
                <span className="mt-2 block break-words font-heading text-4xl font-bold tabular-nums sm:text-5xl">
                  {mode === "pace" ? clock(unit === "mi" ? pacePerKm * KM_PER_MILE : pacePerKm) : clock(totalSeconds, true)}
                  {mode === "pace" && <span className="ml-1 text-base font-medium text-slate-300">/{unit}</span>}
                </span>
                <span className="mt-4 block text-sm leading-relaxed text-slate-300">
                  {clock(pacePerKm * KM_PER_MILE)} per mile · {clock(pacePerKm)} per kilometer
                  {mode === "pace" && ` · ${clock(totalSeconds, true)} finish`}
                </span>
              </>
            ) : (
              <span className="block text-sm leading-relaxed text-slate-200">
                {validDistance ? "Enter a valid time greater than zero. Seconds and finish-time minutes must be between 0 and 59." : "Enter a distance between 0.1 and 1,000 km, or the equivalent in miles."}
              </span>
            )}
          </output>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">Based on an even pace. Hills, weather, and stops can change your actual finish time.</p>
        </div>
      </div>
    </section>
  );
}
