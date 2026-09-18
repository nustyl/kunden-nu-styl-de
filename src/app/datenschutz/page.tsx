import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — NU STYL Kundenportal",
  robots: { index: false, follow: false },
};

export default function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      <LegalSection heading="1. Verantwortlicher">
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          <br />
          <br />
          Luc Picard — NU STYL
          <br />
          Amselweg 9a, 63500 Seligenstadt
          <br />
          Telefon:{" "}
          <a href="tel:+491742175996" className="text-orange-400 font-semibold">
            +49 174 2175996
          </a>
          <br />
          E-Mail:{" "}
          <a href="mailto:info@nu-styl.de" className="text-orange-400 font-semibold">
            info@nu-styl.de
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="2. Ihre Rechte als betroffene Person">
        <p>Ihnen stehen gegenüber uns bezüglich Ihrer personenbezogenen Daten folgende Rechte zu:</p>
        <ul className="list-disc pl-5 grid gap-1">
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Löschung (Art. 17 DSGVO)</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruchsrecht gegen die Verarbeitung (Art. 21 DSGVO)</li>
          <li>Recht auf Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)</li>
          <li>Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
        </ul>
        <p>Zuständige Aufsichtsbehörde: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit.</p>
      </LegalSection>

      <LegalSection heading="3. Zugang zum Kundenportal">
        <p>
          Dieses Kundenportal ist kein öffentliches Angebot. Der Zugang wird ausschließlich durch
          NU STYL per persönlicher Einladung eingerichtet (Name und E-Mail-Adresse). Eine
          öffentliche Registrierung ist nicht möglich. Die Anmeldung erfolgt passwortlos per
          Anmeldelink (&bdquo;Magic Link&ldquo;) an die hinterlegte E-Mail-Adresse.
        </p>
        <p>
          Rechtsgrundlage der Verarbeitung ist die Erfüllung des zwischen Ihnen bzw. Ihrem
          Unternehmen und NU STYL bestehenden Vertrags über die Social-Media-Betreuung (Art. 6
          Abs. 1 lit. b DSGVO).
        </p>
      </LegalSection>

      <LegalSection heading="4. Im Kundenportal eingesetzte Auftragsverarbeiter">
        <p>
          Zum Betrieb dieses Portals setzen wir folgende Auftragsverarbeiter gemäß Art. 28 DSGVO
          ein, mit denen jeweils entsprechende Verträge bestehen:
        </p>
        <ul className="list-disc pl-5 grid gap-2">
          <li>
            <strong>Supabase, Inc.</strong> — Authentifizierung (Anmeldelink) und Datenbank
            (Beitrags-Metadaten, Kommentare, Freigabe-Status). Serverstandort der Datenbank:
            Frankfurt/EU.
          </li>
          <li>
            <strong>Cloudflare, Inc.</strong> (Cloudflare R2) — Speicherung der von NU STYL
            hochgeladenen Bild- und Videodateien. Der Speicher ist privat, ein öffentlicher
            Zugriff ist nicht möglich; Dateien werden ausschließlich über kurzlebige, individuell
            geprüfte Zugriffslinks ausgeliefert.
          </li>
          <li>
            <strong>Resend</strong> (sofern aktiviert) — Versand von E-Mail-Benachrichtigungen,
            z. B. wenn neue Beiträge zur Freigabe bereitstehen.
          </li>
        </ul>
        <p>
          Da diese Anbieter teils außerhalb der EU ansässig sind bzw. Server dort betreiben können,
          kann es zu einer Datenübermittlung in Drittländer kommen. Mit den genannten Anbietern
          bestehen Datenverarbeitungsvereinbarungen auf Grundlage der EU-Standardvertragsklauseln
          (Art. 46 Abs. 2 lit. c DSGVO).
        </p>
      </LegalSection>

      <LegalSection heading="5. Hosting & Server-Logfiles">
        <p>
          Dieses Portal wird bei Netlify, Inc. (2325 3rd Street, Suite 296, San Francisco, CA
          94107, USA) gehostet. Beim Aufruf erhebt Netlify automatisch technisch notwendige
          Informationen (Server-Logfiles): IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene
          Seite, übertragene Datenmenge, Browsertyp und -version, verwendetes Betriebssystem sowie
          die zuvor besuchte Seite (Referrer).
        </p>
        <p>
          Diese Daten dienen ausschließlich der technisch fehlerfreien Bereitstellung und
          Absicherung des Portals. Rechtsgrundlage ist unser berechtigtes Interesse gemäß Art. 6
          Abs. 1 lit. f DSGVO. Mit Netlify besteht eine Datenverarbeitungsvereinbarung auf
          Grundlage der EU-Standardvertragsklauseln.
        </p>
      </LegalSection>

      <LegalSection heading="6. SSL-/TLS-Verschlüsselung">
        <p>
          Dieses Portal nutzt eine SSL-/TLS-Verschlüsselung, um die Übertragung vertraulicher
          Inhalte zu schützen. Eine verschlüsselte Verbindung erkennen Sie am Kürzel „https://“
          und dem Schloss-Symbol in Ihrer Browserzeile.
        </p>
      </LegalSection>

      <LegalSection heading="7. Cookies & lokale Speicherung">
        <p>
          Dieses Portal verwendet keine Tracking- oder Marketing-Cookies und keine Analysetools.
          Für die Anmeldung setzt Supabase ein technisch notwendiges Cookie, das Ihre Sitzung nach
          dem Login aufrechterhält. Ohne dieses Cookie ist die Nutzung des Portals nicht möglich.
        </p>
        <p>
          Diese Speicherung ist gemäß § 25 Abs. 2 Nr. 2 TTDSG technisch erforderlich und bedarf
          keiner gesonderten Einwilligung.
        </p>
      </LegalSection>

      <LegalSection heading="8. Schriftarten (Web Fonts)">
        <p>
          Wir binden die verwendeten Schriftarten („Inter“, „Space Grotesk“) lokal auf unserem
          eigenen Server ein. Es findet keine Verbindung zu Servern von Google Fonts oder anderen
          Drittanbietern statt, sodass hierbei keine personenbezogenen Daten an Dritte übertragen
          werden.
        </p>
      </LegalSection>

      <LegalSection heading="9. Direkte Kontaktaufnahme">
        <p>
          Wenn Sie uns per E-Mail oder Telefon kontaktieren, werden die von Ihnen mitgeteilten
          Daten (z. B. Name, Kontaktdaten, Nachricht) von uns gespeichert, um Ihre Anfrage zu
          bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO.
        </p>
      </LegalSection>

      <LegalSection heading="10. Änderung dieser Datenschutzerklärung">
        <p>
          Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte
          Rechtslagen oder Änderungen des Portals anzupassen. Es gilt jeweils die auf dieser Seite
          veröffentlichte, aktuelle Fassung.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
