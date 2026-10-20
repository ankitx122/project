import LoginCard from "@/components/auth/LoginCard";

export const metadata = {
  title: "Sign in · IP Intelligence",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-start justify-center px-4 pt-24">
      <LoginCard />
    </main>
  );
}
