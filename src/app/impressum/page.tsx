import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Impressum — NU STYL Kundenportal",
  robots: { index: false, follow: false },
};

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <LegalSection heading="Angaben gemäß § 5 TMG">
        <p>
          Luc Picard
          <br />
          NU STYL (Einzelunternehmen)
          <br />
          Amselweg 9a
          <br />
          63500 Seligenstadt
          <br />
          Deutschland
        </p>
      </LegalSection>

      <LegalSection heading="Kontakt">
        <p>
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

      <LegalSection heading="Umsatzsteuer">
        <p>
          Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer erhoben (Kleinunternehmerregelung). Eine
          Umsatzsteuer-Identifikationsnummer wird daher nicht ausgewiesen.
        </p>
      </LegalSection>

      <LegalSection heading="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          Luc Picard
          <br />
          Amselweg 9a, 63500 Seligenstadt
        </p>
      </LegalSection>

      <LegalSection heading="EU-Streitschlichtung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
          bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener"
            className="text-orange-400 font-semibold"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </LegalSection>

      <LegalSection heading="Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen.
        </p>
        <p>
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
          allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
          erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
          Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
          entfernen.
        </p>
      </LegalSection>

      <LegalSection heading="Haftung für Links">
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
          übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
          Betreiber der Seiten verantwortlich.
        </p>
        <p>
          Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße
          überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
          Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
          Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
          Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>
      </LegalSection>

      <LegalSection heading="Urheberrecht">
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
          dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
          der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
          Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind
          nur für den privaten, nicht kommerziellen Gebrauch gestattet.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
