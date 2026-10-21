"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginPath } from "@/lib/returnTo";
import { useAuth } from "./AuthProvider";

function Checking() {
  return (
    <div className="flex flex-1 items-center justify-center py-24" aria-busy="true">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
    </div>
  );
}

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || user) return;
    const { pathname, search } = window.location;
    router.replace(loginPath(pathname + search));
  }, [loading, user, router]);

  return user ? children : <Checking />;
}
