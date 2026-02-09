import { Layout } from "@/components/layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Mail, MessageSquare, AlertTriangle, HelpCircle } from "lucide-react";

export default function ContactPage() {
  return (
    <Layout>
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-heading font-extrabold text-4xl mb-4" data-testid="text-contact-title">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-10">Have a question, found an error, or want to partner with us? We'd love to hear from you.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">General Inquiries</h3>
            </div>
            <p className="text-sm text-muted-foreground">For general questions about running.services or partnership opportunities.</p>
            <a href="mailto:hello@running.services" className="text-primary text-sm hover:underline" data-testid="link-email-general">hello@running.services</a>
          </div>

          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Data Corrections</h3>
            </div>
            <p className="text-sm text-muted-foreground">Found incorrect race or route information? Let us know and we'll fix it.</p>
            <a href="mailto:data@running.services" className="text-primary text-sm hover:underline" data-testid="link-email-data">data@running.services</a>
          </div>

          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Race Organizers</h3>
            </div>
            <p className="text-sm text-muted-foreground">Want to add or update your race listing? Reach out and we'll help.</p>
            <a href="mailto:races@running.services" className="text-primary text-sm hover:underline" data-testid="link-email-races">races@running.services</a>
          </div>

          <div className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Support</h3>
            </div>
            <p className="text-sm text-muted-foreground">Having trouble with the site or need help finding something?</p>
            <a href="mailto:support@running.services" className="text-primary text-sm hover:underline" data-testid="link-email-support">support@running.services</a>
          </div>
        </div>

        <div className="border-t pt-8">
          <h2 className="font-heading font-bold text-xl text-foreground mb-4">Frequently Asked</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground mb-1">How often is race data updated?</h3>
              <p>Our race database is updated regularly from official sources including the RunSignUp API. We process thousands of race listings across all 50 states.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Can I submit a race or route?</h3>
              <p>Yes! If your race or route is missing, email us at races@running.services with the details and we'll review it for inclusion.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Is the data free to use?</h3>
              <p>running.services is free for personal use. For commercial use or bulk data access, please contact us to discuss terms.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
