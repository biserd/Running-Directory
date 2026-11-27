declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackEvent(name: string, params: Record<string, string>) {
  window.gtag?.("event", name, {
    ...params,
    page_location: `${window.location.origin}${window.location.pathname}`,
  });
}

export function trackLead(kind: "race_claim" | "pro" | "report" | "api" | "sponsorship" | "race_guide_alert") {
  trackEvent("generate_lead", { lead_type: kind });
}

export function trackClaimVerified(method: "domain_match" | "email_link") {
  trackEvent("race_claim_verified", { verification_method: method });
}
