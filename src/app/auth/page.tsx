import { Suspense } from "react";

import { AuthPageClient } from "@/app/auth/AuthPageClient";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient />
    </Suspense>
  );
}
