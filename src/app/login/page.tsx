"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "signingIn">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search);
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    // Einladungs-Links von Supabase liefern die Sitzung als #access_token=… im
    // Link (kein ?code=). Hier daraus eine Sitzung machen.
    const accessToken = fromHash.get("access_token");
    const refreshToken = fromHash.get("refresh_token");
    if (accessToken && refreshToken) {
      setStatus("signingIn");
      createClient()
        .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setStatus("error");
            setError(`Anmeldung fehlgeschlagen: ${sessionError.message}`);
            return;
          }
          window.location.replace("/");
        });
      return;
    }

    const message =
      fromQuery.get("error") ??
      fromHash.get("error_description") ??
      fromHash.get("error");
    if (message) setError(message);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setStatus("error");
      setError(
        error.message.includes("Signups not allowed")
          ? "Diese E-Mail-Adresse ist nicht eingeladen. Bitte wende dich an NU STYL."
          : error.message
      );
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="NU STYL" width={160} height={62} priority />
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-md p-6">
          <h1 className="text-xl font-semibold mb-1">Willkommen zurück</h1>
          <p className="text-sm text-ink-300 mb-6">
            Gib deine E-Mail-Adresse ein, du bekommst einen Anmeldelink.
          </p>

          {status === "signingIn" ? (
            <p className="text-sm text-ink-300">Du wirst angemeldet…</p>
          ) : status === "sent" ? (
            <div className="rounded-sm border border-green-800 bg-green-950/40 text-green-400 text-sm p-4">
              Check dein Postfach — wir haben dir einen Link geschickt. Er
              ist ca. 1 Stunde gültig.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@firma.de"
                  className="min-h-[48px] px-4 rounded-sm border border-ink-600 bg-ink-900 text-paper placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="min-h-[48px] rounded-full bg-orange-600 font-display font-semibold text-sm hover:shadow-brand transition-shadow disabled:opacity-50"
              >
                {status === "sending" ? "Wird gesendet…" : "Anmeldelink senden"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-4 text-xs text-ink-500">
          <Link href="/impressum" className="hover:text-ink-300">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-ink-300">
            Datenschutz
          </Link>
        </div>
      </div>
    </main>
  );
}
