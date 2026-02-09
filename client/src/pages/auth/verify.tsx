import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiVerifyToken } from "@/lib/api";
import { Layout } from "@/components/layout";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthVerifyPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found.");
      return;
    }

    apiVerifyToken(token)
      .then(() => {
        setStatus("success");
        refreshUser();
        setTimeout(() => navigate("/"), 2000);
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
            <div className="flex flex-col items-center gap-4" data-testid="verify-loading">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="font-heading text-2xl font-bold">Verifying your sign-in...</h1>
              <p className="text-muted-foreground">Just a moment while we verify your link.</p>
            </div>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-4" data-testid="verify-success">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="font-heading text-2xl font-bold">You're signed in!</h1>
              <p className="text-muted-foreground">Redirecting you to the homepage...</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4" data-testid="verify-error">
              <XCircle className="h-12 w-12 text-red-500" />
              <h1 className="font-heading text-2xl font-bold">Verification failed</h1>
              <p className="text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => navigate("/")} className="mt-4" data-testid="button-go-home">
                Go to homepage
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
