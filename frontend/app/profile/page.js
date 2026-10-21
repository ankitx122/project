import RequireAuth from "@/components/auth/RequireAuth";
import Profile from "@/components/profile/Profile";

export const metadata = {
  title: "Profile · IP Intelligence",
};

export const instant = false;

export default function ProfilePage() {
  return (
    <RequireAuth>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-10 sm:px-6">
        <Profile />
      </main>
    </RequireAuth>
  );
}
