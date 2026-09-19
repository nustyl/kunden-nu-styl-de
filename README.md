# NU STYL Kundenportal

Eigenständiges Next.js-Projekt für `kunden.nu-styl.de`. Kunden sehen hier
ihre fertigen Beiträge & Reels, geben sie frei oder wünschen Änderungen.
Die Hauptseite `nu-styl.de` (statisches HTML auf Netlify) ist davon
komplett unberührt.

**Tech-Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS ·
Supabase (Auth + Postgres + RLS) · Cloudflare R2 (Medien-Speicher) ·
Netlify (Hosting) · optional Resend (E-Mail).

---

## Inhalt

1. [Supabase-Projekt einrichten](#1-supabase-projekt-einrichten)
2. [Cloudflare R2 einrichten](#2-cloudflare-r2-einrichten)
3. [Lokale Entwicklung](#3-lokale-entwicklung)
4. [Netlify Deployment](#4-netlify-deployment)
5. [Strato: Subdomain einrichten](#5-strato-subdomain-einrichten)
6. [Optional: E-Mail-Benachrichtigungen (Resend)](#6-optional-e-mail-benachrichtigungen-resend)
7. [Free-Plan-Grenzen, auf die du achten musst](#7-free-plan-grenzen-auf-die-du-achten-musst)
8. [Datenschutz-Hinweis](#8-datenschutz-hinweis)

---

## 1. Supabase-Projekt einrichten

1. Auf [supabase.com](https://supabase.com) ein neues Projekt anlegen.
   **Region: Frankfurt (EU Central)** wählen.
2. Unter **Project Settings → API** findest du:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` Key → `SUPABASE_SERVICE_ROLE_KEY` (**geheim halten!**)
3. **Registrierung deaktivieren:** Unter **Authentication → Settings**
   (bzw. "Sign In / Providers" je nach Supabase-Version) die Option
   **"Allow new users to sign up"** ausschalten. Kunden können sich so
   nur per Einladung anmelden, nicht selbst registrieren.
4. **Redirect-URL eintragen:** Unter **Authentication → URL
   Configuration**:
   - Site URL: `https://kunden.nu-styl.de`
   - Redirect URLs: `https://kunden.nu-styl.de/auth/callback` und für
     lokale Entwicklung zusätzlich `http://localhost:3000/auth/callback`
5. **E-Mail-Vorlagen anpassen (wichtig, sonst funktioniert der Login
   nicht in jedem Browser):** Unter **Authentication → Emails →
   Templates** die Vorlagen **"Magic link or OTP"** und **"Invite user"**
   so ändern, dass der Link auf die Bestätigungsseite des Portals zeigt.
   Damit funktioniert der Link in jedem Browser und auf jedem Gerät
   (Handy-Mail-Apps öffnen Links oft in einem anderen Browser).

   Magic link or OTP:
   ```html
   <h2>Anmeldung im NU STYL Kundenportal</h2>
   <p>Tippe auf den Button, um dich anzumelden. Der Link ist nur kurz gültig und funktioniert einmal.</p>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Jetzt anmelden</a></p>
   ```
   Invite user:
   ```html
   <h2>Du wurdest zum NU STYL Kundenportal eingeladen</h2>
   <p>Tippe auf den Button, um deinen Zugang zu aktivieren. Der Link funktioniert einmal.</p>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Zugang aktivieren</a></p>
   ```
6. **Datenbank-Migrationen ausführen:** Im Supabase-Dashboard unter **SQL
   Editor** die Dateien aus [`supabase/migrations/`](supabase/migrations)
   **der Reihe nach und jede einzeln** (eigene Abfrage pro Datei)
   ausführen: `0001_init.sql`, `0002_add_status_value.sql` (muss allein
   laufen), `0003_revision_rounds_and_scheduling.sql`,
   `0004_revision_rounds_per_format.sql`,
   `0005_edit_delete_comments.sql`. Das legt Tabellen, RLS-Policies,
   Trigger und die Funktionen für Freigabe, Terminvorschlag und
   Kommentare an. Bei einem Update der App zuerst die neuen Migrationen
   ausführen, dann deployen.
7. **Deinen eigenen Account zum Admin machen:**
   1. Da die Registrierung deaktiviert ist, lade dich zuerst selbst ein:
      Supabase-Dashboard → **Authentication → Users → Invite user** mit
      deiner eigenen E-Mail-Adresse (ohne `client_id`, ohne Metadata).
      Der Trigger legt automatisch ein `profiles`-Row mit
      `role = 'client'` an.
   2. Starte die App lokal (siehe unten) und melde dich auf `/login`
      mit genau dieser E-Mail-Adresse an (Magic Link aus der
      Einladungs-Mail bzw. ein neu angeforderter Link).
   3. Anschließend im SQL Editor dich selbst zum Admin machen:
      ```sql
      update public.profiles
      set role = 'admin', client_id = null
      where id = (select id from auth.users where email = 'DEINE@EMAIL.de');
      ```
   4. Ab jetzt landest du nach dem Login automatisch im Admin-Panel
      (`/admin`) und kannst dort weitere Kunden & Personen einladen —
      alle folgenden Einladungen bekommen automatisch die richtige
      `client_id` und Rolle mitgegeben, du musst das SQL nicht wieder
      anfassen.

---

## 2. Cloudflare R2 einrichten

1. Im Cloudflare-Dashboard unter **R2** einen neuen Bucket anlegen,
   z. B. `nu-styl-kundenportal`. Region: automatisch (R2 ist global,
   aber die Daten bleiben faktisch in der EU, wenn dein Account/Workers
   in der EU liegt — für striktere Kontrolle kannst du bei "Location
   Hint" `EU` wählen).
2. **API-Token mit minimalen Rechten** anlegen: **R2 → Manage API
   Tokens → Create API Token**. Berechtigung: **"Object Read & Write"**,
   beschränkt auf den einen Bucket. Du bekommst:
   - `Access Key ID` → `R2_ACCESS_KEY_ID`
   - `Secret Access Key` → `R2_SECRET_ACCESS_KEY`
   - Deine `Account ID` (oben rechts im Dashboard) → `R2_ACCOUNT_ID`
   - Bucket-Name → `R2_BUCKET_NAME`
3. **CORS-Regeln setzen** (Bucket → Settings → CORS Policy), damit der
   Browser direkt per presigned URL hochladen darf:
   ```json
   [
     {
       "AllowedOrigins": [
         "https://kunden.nu-styl.de",
         "http://localhost:3000"
       ],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
   Das `ExposeHeaders: ["ETag"]` ist wichtig für den Multipart-Upload
   großer Videos — ohne das kann der Browser die ETag-Antwort nach
   jedem Part nicht auslesen.
4. **Zahlungsmethode hinterlegen:** R2 verlangt eine hinterlegte
   Kreditkarte, auch im kostenlosen Kontingent (10 GB Speicher, 1 Mio.
   Class-A- und 10 Mio. Class-B-Operationen/Monat gratis). Es wird
   nichts abgebucht, solange du im Freikontingent bleibst — aber ohne
   hinterlegte Karte lässt sich der Bucket gar nicht erst anlegen.
5. Der Bucket bleibt **komplett privat** — es gibt keinen öffentlichen
   Zugriff, alle Downloads laufen über kurzlebige presigned URLs, die
   `/api/r2/view/[...key]` erst nach RLS-Prüfung ausstellt.

---

## 3. Lokale Entwicklung

```bash
cd kunden-nu-styl-de
npm install
cp .env.example .env.local
```

`.env.local` mit deinen Werten aus Schritt 1 & 2 befüllen. Für lokale
Entwicklung `NEXT_PUBLIC_SITE_URL=http://localhost:3000` setzen.

```bash
npm run dev
```

Die App läuft dann auf [http://localhost:3000](http://localhost:3000).

---

## 4. Netlify Deployment

1. Das Projekt zu einem GitHub-Repository pushen (separates Repo, nicht
   das der Hauptseite).
2. Auf [app.netlify.com](https://app.netlify.com): **Add new site → Import
   an existing project** → GitHub-Repo auswählen.
3. Netlify erkennt Next.js automatisch (via `@netlify/plugin-nextjs`,
   in `netlify.toml` bereits konfiguriert). Build command:
   `npm run build`, Publish directory: `.next`.
4. Unter **Site settings → Environment variables** alle Werte aus
   `.env.example` eintragen (mit den echten Werten aus Schritt 1 & 2),
   `NEXT_PUBLIC_SITE_URL=https://kunden.nu-styl.de`.
5. **Custom Domain hinzufügen:** **Site settings → Domain management →
   Add a domain** → `kunden.nu-styl.de` eintragen. Netlify zeigt dir
   danach den Ziel-Hostnamen für den CNAME-Eintrag (etwas wie
   `dein-projekt.netlify.app`).
6. Deploy anstoßen (passiert i. d. R. automatisch nach dem Import).

---

## 5. Strato: Subdomain einrichten

1. Im Strato-Kundenlogin zur Domain `nu-styl.de` → **DNS-Verwaltung**.
2. Neuen **CNAME-Eintrag** anlegen:
   - Subdomain/Präfix: `kunden`
   - Ziel: die Netlify-Adresse aus Schritt 4.5 (z. B.
     `dein-projekt.netlify.app`)
   - TTL: Standard belassen
3. Speichern. DNS-Propagation kann bis zu ein paar Stunden dauern
   (meist deutlich schneller).
4. Sobald der CNAME aktiv ist, stellt Netlify automatisch ein
   kostenloses HTTPS-Zertifikat (Let's Encrypt) für
   `kunden.nu-styl.de` aus — das kann nach der DNS-Umstellung noch
   einige Minuten bis Stunden dauern. Status siehe **Netlify → Domain
   management**.
5. Die Hauptdomain `nu-styl.de` bleibt komplett unangetastet — es wird
   nur ein zusätzlicher CNAME für die Subdomain `kunden` angelegt.

---

## 6. Optional: E-Mail-Benachrichtigungen (Resend)

Ohne `RESEND_API_KEY` sind Benachrichtigungen komplett deaktiviert —
alles andere funktioniert normal.

1. Kostenlosen Account auf [resend.com](https://resend.com) anlegen
   (Free-Tier: 3.000 E-Mails/Monat, 100/Tag).
2. Domain verifizieren: am besten eine eigene Subdomain (z. B.
   `portal.nu-styl.de`) mit den von Resend angezeigten DNS-Einträgen bei
   Strato. Ohne verifizierte Domain darf Resend nur an die eigene
   Account-Adresse senden. Zusätzlich in Supabase unter
   **Authentication → Emails → SMTP Settings** den Resend-SMTP
   (`smtp.resend.com`, Port 465, Benutzer `resend`, Passwort = API-Key)
   eintragen, sonst begrenzt Supabase die Login-Mails stark.
3. API-Key erzeugen → `RESEND_API_KEY`.
4. `RESEND_FROM_EMAIL` und `ADMIN_NOTIFICATION_EMAIL` (deine eigene
   Adresse, an die Freigaben/Kommentare/Änderungswünsche gemeldet
   werden) in den Umgebungsvariablen (lokal & bei Netlify) setzen.

Aktuell implementiert: Benachrichtigung an dich, wenn ein Kunde freigibt,
eine Änderung wünscht oder kommentiert. Die gesammelte Kunden-Mail bei
neuen Freigaben (statt einer pro Beitrag) ist als Erweiterung
vorgesehen — bei Bedarf ergänzen wir eine "gesammelt versenden"-Aktion
im Admin-Panel.

---

## 7. Free-Plan-Grenzen, auf die du achten musst

- **Supabase Free:** Projekte werden nach **ca. 7 Tagen ohne
  Aktivität** pausiert (nicht gelöscht — ein Klick im Dashboard reicht
  zum Reaktivieren, aber die App ist bis dahin offline). Wenn du länger
  nichts postest, lohnt sich ein kurzer Login alle paar Tage oder ein
  kostenloser Cron-Ping (z. B. via GitHub Actions) auf eine
  Health-Check-Route.
- **Supabase Free:** 500 MB Datenbank, 5 GB Bandbreite/Monat, 50.000
  monatlich aktive Nutzer — für dieses Projekt (nur Metadaten in der
  DB, Medien liegen in R2) bei weitem ausreichend.
- **Cloudflare R2 Free:** 10 GB Speicher, 1 Mio. Class-A-Operationen
  (Schreiben/Auflisten) und 10 Mio. Class-B-Operationen (Lesen) pro
  Monat gratis. **Erfordert hinterlegte Zahlungsmethode**, auch wenn
  nichts abgerechnet wird, solange du im Kontingent bleibst. Denk
  daran, veröffentlichte Beiträge im Admin-Panel zu löschen (Button
  "aus R2 löschen"), um Speicher zu sparen.
- **Netlify Free (Credits):** 300 Credits pro Monat, **jeder
  Produktions-Deploy kostet 15 Credits** (ca. 20 Deploys). Jeder Push
  auf `main` ist ein Deploy, daher Änderungen bündeln. Sind die Credits
  aufgebraucht, werden **alle Projekte des Teams pausiert**, auch die
  Hauptseite. Stand unter Team → Usage & billing prüfen. Da Medien nicht
  über Netlify laufen (direkter Browser-Upload/-Download zu/von R2),
  bleibt der Traffic hier gering.
- **Resend Free** (falls genutzt): 3.000 E-Mails/Monat, 100/Tag — für
  Benachrichtigungen an dich + gelegentliche Kunden-Mails reichlich.

---

## 8. Datenschutz-Hinweis

Für deine Datenschutzerklärung solltest du ergänzen, dass folgende
Auftragsverarbeiter eingesetzt werden:

- **Supabase Inc.** (Hosting-Region: EU/Frankfurt) — Authentifizierung
  und Datenbank. Ein Auftragsverarbeitungsvertrag (DPA) lässt sich im
  Supabase-Dashboard abschließen.
- **Cloudflare, Inc.** — Speicherung der Medien-Dateien (Bilder,
  Videos) über Cloudflare R2.
- Falls Resend genutzt wird: **Resend** für den Versand von
  Benachrichtigungs-E-Mails.

---

## Projektstruktur

```
src/
  middleware.ts          Session-Refresh + Zugriffsschutz für /admin
  app/
    login/                Magic-Link-Login
    auth/callback/         Tauscht den Link-Code gegen eine Session
    (portal)/              Kundenansicht (Liste, Detail, Freigabe, Kommentare)
    admin/                 Admin-Panel (Dashboard, Kunden, Beiträge, Upload)
    api/
      r2/                  Presigned Upload/Download, Multipart, Löschen
      posts/[id]/status/    Freigabe / Änderungswunsch (RPC-Wrapper)
      comments/             Kommentare + Admin-Benachrichtigung
  components/{ui,portal,admin}/
  lib/
    supabase/{client,server,admin}.ts
    r2/{client,presign}.ts
    email/resend.ts
    actions/admin.ts        Server Actions für das Admin-Panel
supabase/migrations/               0001–0005: Tabellen, RLS, Trigger, Funktionen
```

## Sicherheitsmodell (kurz)

- Kunden sehen ausschließlich Beiträge ihrer eigenen `client_id` und
  nur, sobald der Status nicht mehr `entwurf` ist — durchgesetzt per
  Row Level Security, nicht nur im UI.
- Kunden können den Status eines Beitrags **nicht** direkt per `UPDATE`
  ändern — dafür gibt es die Postgres-Funktion `set_post_status()`
  (SECURITY DEFINER), die Berechtigung und erlaubte Zielwerte selbst
  prüft.
- Kommentare bearbeiten/löschen laufen über `edit_comment()` /
  `delete_comment()` (Admin: alle, Kunde: nur eigene). Solange ein
  Beitrag auf "Änderung gewünscht" steht, sind Freigabe und neue
  Änderungsrunden für den Kunden gesperrt (Ergänzen bleibt möglich).
- R2-Zugangsdaten und der Supabase-Service-Role-Key werden ausschließlich
  in Route Handlers / Server Actions verwendet, nie im Client-Bundle.
- Jede presigned Download-URL wird erst ausgestellt, nachdem geprüft
  wurde, dass der eingeloggte Nutzer laut RLS auf die zugehörige
  `post_media`-Zeile zugreifen darf.
