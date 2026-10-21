import LoginCard from "@/components/auth/LoginCard";
import LoginShowcase from "@/components/auth/LoginShowcase";

export const metadata = {
  title: "Sign in · IP Intelligence",
};

// Split layout on wide screens: the green welcome panel on the left, the form on the right.
export default function LoginPage() {
  return (
    <main className="grid flex-1 gap-4 p-3 sm:p-4 lg:min-h-[calc(100dvh-3.5rem-1px)] lg:grid-cols-2">
      <div className="hidden lg:block">
        <LoginShowcase />
      </div>
      <div className="flex justify-center px-2 py-12 sm:py-16 lg:items-center lg:py-6">
        <LoginCard />
      </div>
    </main>
  );
}
