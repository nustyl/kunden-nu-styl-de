import Image from "next/image";
import Link from "next/link";
import { BackgroundFX } from "@/components/ui/BackgroundFX";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <BackgroundFX />
      <header className="border-b border-ink-700">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="NU STYL" width={110} height={43} />
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 grid gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-2">
            Rechtliches
          </p>
          <h1 className="text-2xl font-display font-semibold">{title}</h1>
        </div>
        {children}
      </main>
      <footer className="max-w-3xl mx-auto px-4 py-8 text-xs text-ink-500 flex gap-4">
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

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-ink-700 bg-ink-800 p-5 grid gap-2">
      <h2 className="font-display font-semibold text-base">{heading}</h2>
      <div className="text-sm text-ink-300 leading-relaxed grid gap-2">{children}</div>
    </section>
  );
}
