import { useEffect, useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiClaimVerify } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthVerifyClaimPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [raceName, setRaceName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token in the link.");
      return;
    }
    apiClaimVerify(token)
      .then(async (data) => {
        setRaceName(data.race.name);
        setStatus("success");
        await refreshUser();
        setTimeout(() => navigate("/organizers/dashboard"), 1400);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Verification failed. The link may have expired.");
      });
  }, [search, navigate, refreshUser]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center">
          {status === "verifying" && (
            <div className="flex flex-col items-center gap-4" data-testid="verify-claim-loading">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="font-heading text-2xl font-bold">Verifying your claim…</h1>
              <p className="text-muted-foreground">One sec while we confirm your access.</p>
            </div>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-4" data-testid="verify-claim-success">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h1 className="font-heading text-2xl font-bold">You're in.</h1>
              <p className="text-muted-foreground">
                {raceName ? <>You now own <strong>{raceName}</strong>. </> : null}
                Taking you to your organizer dashboard…
              </p>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4" data-testid="verify-claim-error">
              <XCircle className="h-12 w-12 text-red-500" />
              <h1 className="font-heading text-2xl font-bold">Verification failed</h1>
              <p className="text-muted-foreground">{errorMessage}</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" data-testid="button-claim-error-home"><Link href="/">Home</Link></Button>
                <Button asChild data-testid="button-claim-error-retry"><Link href="/for-organizers">Try claiming again</Link></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
