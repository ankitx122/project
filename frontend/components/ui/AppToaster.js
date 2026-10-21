"use client";

import toast, { Toaster } from "react-hot-toast";
import { Info } from "lucide-react";

export function googleOnlyToast(title) {
  toast(
    <div className="text-[13px] leading-5">
      <div className="font-medium text-zinc-100">{title}</div>
      <div className="text-zinc-400">Accounts use Google sign-in. Please continue with Google.</div>
    </div>,
    { id: "google-only", icon: <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />, duration: 4500 },
  );
}

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      gutter={10}
      containerStyle={{ top: 72 }}
      toastOptions={{
        style: {
          background: "#18181b",
          color: "#f4f4f5",
          border: "1px solid #27272a",
          borderRadius: "12px",
          padding: "10px 14px",
          maxWidth: 420,
          alignItems: "flex-start",
          boxShadow: "0 16px 40px -12px rgb(0 0 0 / 0.6)",
        },
        success: { iconTheme: { primary: "#34d399", secondary: "#18181b" } },
        error: { iconTheme: { primary: "#f87171", secondary: "#18181b" } },
      }}
    />
  );
}
