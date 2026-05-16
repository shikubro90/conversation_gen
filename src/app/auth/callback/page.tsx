"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { extractTokenFromHash } from "@/lib/google";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for error in query string (e.g. user denied access)
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(err === "access_denied" ? "You cancelled the Google sign-in." : `Authorization failed: ${err}`);
      setStatus("error");
      return;
    }

    // Token comes back in the URL hash for implicit flow
    const token = extractTokenFromHash();
    if (!token) {
      setError("No token received from Google. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("success");
    setTimeout(() => router.push("/settings"), 1800);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting your Google account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold">Google connected successfully.</p>
            <p className="text-xs text-muted-foreground">Taking you back to Settings...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
              Back to Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
