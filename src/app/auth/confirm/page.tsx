"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { BackgroundFX } from "@/components/ui/BackgroundFX";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "magiclink", "invite", "signup", "recovery"];

// Bestätigungsseite für Anmelde-/Einladungslinks aus der E-Mail. Der Link
// enthält ein Token (token_hash), das in jedem Browser und auf jedem Gerät
// eingelöst werden kann. Eingelöst wird erst per Klick, damit Mail-Scanner den
// einmaligen Link nicht schon vorher verbrauchen.
export default function ConfirmPage() {
  const [params, setParams] = useState<{ tokenHash: string; type: EmailOtpType } | null | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const tokenHash = search.get("token_hash");
    const type = search.get("type") as EmailOtpType | null;
    setParams(tokenHash && type && ALLOWED_TYPES.includes(type) ? { tokenHash, type } : null);
  }, []);

  async function handleConfirm() {
    if (!params || loading) return;
    setLoading(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.type,
    });
    if (verifyError) {
      setLoading(false);
      setError(
        /expired|invalid/i.test(verifyError.message)
          ? "Dieser Link ist abgelaufen oder wurde schon benutzt. Bitte fordere auf der Anmeldeseite einen neuen Link an."
          : `Anmeldung fehlgeschlagen: ${verifyError.message}`
      );
      return;
    }
    window.location.replace("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <BackgroundFX />
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="NU STYL" width={160} height={62} priority />
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-md p-6">
          {params === undefined ? (
            <p className="text-sm text-ink-300">Einen Moment…</p>
          ) : params === null ? (
            <div className="grid gap-4">
              <h1 className="text-xl font-semibold">Link ungültig</h1>
              <p className="text-sm text-ink-300">
                Dieser Anmeldelink ist unvollständig. Bitte fordere einen neuen an.
              </p>
              <Link
                href="/login"
                className="min-h-[48px] rounded-full bg-orange-600 font-display font-semibold text-sm flex items-center justify-center hover:shadow-brand transition-shadow"
              >
                Zur Anmeldung
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              <div>
                <h1 className="text-xl font-semibold mb-1">Anmelden</h1>
                <p className="text-sm text-ink-300">
                  Bestätige die Anmeldung im NU STYL Kundenportal.
                </p>
              </div>
              {error && (
                <div className="grid gap-3">
                  <p className="text-sm text-red-400">{error}</p>
                  <Link href="/login" className="text-sm text-orange-400 underline">
                    Neuen Link anfordern
                  </Link>
                </div>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="min-h-[48px] rounded-full bg-orange-600 font-display font-semibold text-sm hover:shadow-brand transition-shadow disabled:opacity-50"
              >
                {loading ? "Wird angemeldet…" : "Jetzt anmelden"}
              </button>
            </div>
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
