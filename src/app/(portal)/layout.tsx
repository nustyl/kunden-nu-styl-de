import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/portal/SignOutButton";
import { BackgroundFX } from "@/components/ui/BackgroundFX";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();

  if (!session) redirect("/login");
  if (session.profile.role === "admin") redirect("/admin");
  if (!session.profile.client_id) redirect("/login?error=Kein Kunde zugeordnet");

  return (
    <div className="min-h-screen">
      <BackgroundFX />
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="NU STYL" width={132} height={51} priority />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-base text-ink-300 hidden sm:inline">
              {session.profile.full_name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">{children}</main>
      <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-10 text-sm text-ink-500 flex gap-6 border-t border-ink-800 mt-8">
        <Link href="/impressum" className="hover:text-ink-300">
          Impressum
        </Link>
        <Link href="/datenschutz" className="hover:text-ink-300">
          Datenschutz
        </Link>
      </footer>
    </div>
  );
}
