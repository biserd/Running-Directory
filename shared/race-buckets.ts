export type Bucket = { label: string; min?: number; max?: number };

export const RACE_SIZE_BUCKETS: Bucket[] = [
  { label: "Small (<500)", max: 499 },
  { label: "Mid (500–2,500)", min: 500, max: 2500 },
  { label: "Large (2,500–10K)", min: 2500, max: 10000 },
  { label: "Mega (10K+)", min: 10000 },
];

export const ELEVATION_BUCKETS: Bucket[] = [
  { label: "Flat (<50m)", max: 50 },
  { label: "Rolling (50–200m)", min: 50, max: 200 },
  { label: "Hilly (200–500m)", min: 200, max: 500 },
  { label: "Mountainous (500m+)", min: 500 },
];

export function matchesBucket(value: number | null | undefined, label: string, buckets: Bucket[]): boolean {
  if (value == null) return false;
  const b = buckets.find((x) => x.label === label);
  if (!b) return true;
  if (b.min != null && value < b.min) return false;
  if (b.max != null && value > b.max) return false;
  return true;
}
