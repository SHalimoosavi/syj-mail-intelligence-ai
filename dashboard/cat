"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-base">
      <div className="rounded-lg border border-border bg-surface px-8 py-6 shadow-panel">
        <p className="font-display text-lg font-semibold text-text">
          SYJ Mail Intelligence AI
        </p>

        <p className="mt-2 text-sm text-muted">
          Redirecting to Executive Dashboard...
        </p>
      </div>
    </main>
  );
}
