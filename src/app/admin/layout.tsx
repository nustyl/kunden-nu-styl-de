import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/portal/SignOutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/kunden", label: "Kunden" },
  { href: "/admin/beitraege", label: "Beiträge" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center">
              <Image src="/logo.png" alt="NU STYL" width={100} height={39} priority />
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-sm text-sm text-ink-300 hover:text-paper hover:bg-ink-800 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <SignOutButton />
        </div>
        <nav className="sm:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-none px-3 py-1.5 rounded-full text-sm border border-ink-700 text-ink-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-ink-500 flex gap-4">
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
