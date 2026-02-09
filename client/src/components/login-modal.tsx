import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiSendMagicLink } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

export function LoginModal() {
  const { isLoginOpen, closeLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMessage("");

    try {
      await apiSendMagicLink(email.trim());
      setStatus("sent");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  const handleClose = () => {
    closeLogin();
    setTimeout(() => {
      setEmail("");
      setStatus("idle");
      setErrorMessage("");
    }, 300);
  };

  return (
    <Dialog open={isLoginOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="login-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Sign in to running.services</DialogTitle>
          <DialogDescription>
            Enter your email to receive a magic sign-in link. No password needed.
          </DialogDescription>
        </DialogHeader>

        {status === "sent" ? (
          <div className="flex flex-col items-center gap-4 py-6" data-testid="login-sent-confirmation">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="font-medium text-lg">Check your email</p>
              <p className="text-muted-foreground text-sm mt-1">
                We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>
              </p>
              <p className="text-muted-foreground text-xs mt-3">
                The link expires in 15 minutes. Check your spam folder if you don't see it.
              </p>
            </div>
            <Button variant="outline" onClick={handleClose} className="mt-2" data-testid="button-close-login">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-sm font-medium text-foreground/80 block mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  autoFocus
                  data-testid="input-login-email"
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500" data-testid="text-login-error">{errorMessage}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={status === "sending" || !email.trim()}
              data-testid="button-send-magic-link"
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send magic link"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By signing in, you agree to our{" "}
              <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
              <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
