declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackLead(kind: "race_claim" | "pro" | "report" | "api" | "sponsorship") {
  window.gtag?.("event", "generate_lead", { lead_type: kind });
}
