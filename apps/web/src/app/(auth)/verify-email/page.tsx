"use client";

import { ArrowLeft,CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { Suspense,useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import api from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        await api.post("/auth/verify-email", { token });
        setStatus("success");
        toast.success("Email verified successfully!");
        setTimeout(() => router.push("/login"), 3000);
      } catch {
        setStatus("error");
        toast.error("Verification failed. The link may have expired.");
      }
    };

    verify();
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Verifying your email
          </h1>
          <p className="text-sm text-muted-foreground">
            Please wait a moment…
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Email verified!
            </h1>
            <p className="text-sm text-muted-foreground">
              Your email has been verified. Redirecting to sign in…
            </p>
          </div>
        </div>
        <div className="text-center">
          <Link href="/login">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go to sign in
            </Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Verification failed
          </h1>
          <p className="text-sm text-muted-foreground">
            {!token
              ? "No verification token provided."
              : "The link may have expired or already been used."}
          </p>
        </div>
      </div>
      <div className="text-center">
        <Link href="/login">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </Link>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
