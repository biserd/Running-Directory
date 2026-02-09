import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Privacy Policy" }]} />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-heading font-extrabold text-4xl mb-8" data-testid="text-privacy-title">Privacy Policy</h1>
        <div className="prose max-w-none text-muted-foreground space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: February 9, 2026</p>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">1. Information We Collect</h2>
            <p>running.services is primarily an informational site. We may collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Usage data:</strong> Pages visited, time spent, referring URLs, and browser/device information collected through analytics</li>
              <li><strong>Location data:</strong> Approximate location (with your permission) to show nearby races via the "Races Near Me" feature</li>
              <li><strong>Cookies:</strong> Essential cookies for site functionality and optional analytics cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and improve the Site's features and content</li>
              <li>Show you races and routes near your location</li>
              <li>Understand how users interact with the Site to improve the experience</li>
              <li>Monitor Site performance and troubleshoot issues</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share anonymized, aggregated data with analytics providers to help us understand Site usage. When you click through to external race registration or third-party sites, those sites have their own privacy policies.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">4. Cookies</h2>
            <p>We use cookies to maintain site functionality. You can control cookie preferences through your browser settings. Disabling cookies may affect some features of the Site.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">5. Data Retention</h2>
            <p>Usage data is retained in anonymized form for analytics purposes. We do not maintain personal user accounts or store personal information beyond what is described above.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the data we hold about you</li>
              <li>Request deletion of your data</li>
              <li>Opt out of analytics tracking</li>
              <li>Withdraw consent for location access at any time through your browser</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">7. Children's Privacy</h2>
            <p>The Site is not directed at children under 13. We do not knowingly collect information from children under 13.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised date.</p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground">9. Contact</h2>
            <p>For privacy-related questions, please reach out via our <a href="/contact" className="text-primary hover:underline">Contact page</a>.</p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
