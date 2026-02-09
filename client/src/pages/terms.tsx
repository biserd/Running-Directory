import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function TermsOfService() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Terms of Service" }]} />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-heading font-extrabold text-4xl mb-8" data-testid="text-tos-title">Terms of Service</h1>
        <div className="prose max-w-none text-muted-foreground space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: February 9, 2026</p>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using running.services ("the Site"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Site.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">2. Description of Service</h2>
            <p>running.services provides a race calendar, route directory, and running community resources for runners across the United States. The Site aggregates publicly available race and route data for informational purposes.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">3. Use of the Site</h2>
            <p>You may use the Site for personal, non-commercial purposes. You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Scrape, crawl, or otherwise extract data in bulk without prior written permission</li>
              <li>Use the Site to transmit harmful, illegal, or objectionable content</li>
              <li>Attempt to interfere with the Site's infrastructure or availability</li>
              <li>Misrepresent your identity or affiliation with any person or organization</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">4. Accuracy of Information</h2>
            <p>Race dates, locations, registration details, and route information are provided for informational purposes only. We make reasonable efforts to keep data accurate but cannot guarantee completeness. Always verify details with official race organizers before registering or traveling.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">5. Third-Party Links</h2>
            <p>The Site contains links to third-party websites including race registration pages, route mapping services, and external tools. We are not responsible for the content, privacy practices, or availability of these external sites.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">6. Intellectual Property</h2>
            <p>All original content, design, and branding on running.services is owned by us. Race and route data may be sourced from public databases and third-party APIs and is used in accordance with their respective terms.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">7. Limitation of Liability</h2>
            <p>The Site is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Site, reliance on its information, or inability to access the Site.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">8. Changes to Terms</h2>
            <p>We reserve the right to update these Terms at any time. Changes will be posted on this page with a revised "Last updated" date. Continued use of the Site constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">9. Contact</h2>
            <p>If you have questions about these Terms, please reach out via our <a href="/contact" className="text-primary hover:underline">Contact page</a>.</p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
