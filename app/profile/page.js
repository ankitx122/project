import Profile from "@/components/profile/Profile";

export const metadata = {
  title: "Profile · IP Intelligence",
};

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-10 sm:px-6">
      <Profile />
    </main>
  );
}
