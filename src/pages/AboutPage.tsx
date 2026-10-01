import { AppMark } from '../components/Illustrations';
import { NavBar, Page } from '../components/Layout';
import { useDocumentTitle } from '../lib/title';

export function AboutPage() {
  useDocumentTitle('Om appen');
  return (
    <>
      <NavBar title="Om MindSTEN" fallback="/profile" />
      <Page>
        <header className="person-head" style={{ marginTop: 8, marginBottom: 18 }}>
          <AppMark className="welcome-icon" />
          <h1 className="person-name" style={{ marginTop: -8 }}>
            Enhver sten har en historie
          </h1>
        </header>
        <div className="prose">
          <div className="card">
            <p>
              MindSTEN gør et besøg på kirkegården til en rejse i tiden. Peg kameraet mod en
              gravsten, så læser appen navn og årstal, finder personen og viser, hvilken tid de
              levede i.
            </p>
          </div>

          <h2>Hvor kommer oplysningerne fra?</h2>
          <div className="card">
            <ul>
              <li>
                <strong>Wikidata</strong> (CC0) – navne, datoer, gravsteder og koordinater for
                personer begravet i Danmark.
              </li>
              <li>
                <strong>Wikipedia på dansk</strong> (CC BY-SA 4.0) – biografiernes indledninger, med
                kildehenvisning på hver person.
              </li>
              <li>
                <strong>Wikimedia Commons</strong> – portrætter under de licenser, der står på den
                enkelte fil.
              </li>
              <li>
                <strong>Redaktionelt udvalg</strong> – et kurateret startsæt af kendte danskere samt
                fakta om danmarkshistorien til Tidsvinduet.
              </li>
              <li>
                <strong>Kort</strong> © OpenStreetMaps bidragydere.
              </li>
            </ul>
          </div>

          <h2>AI</h2>
          <div className="card">
            <p>
              Når du scanner, sendes billedet til AI-modellen Claude, som læser teksten på stenen.
              Billedet gemmes ikke. Tidsvinduets fortællinger skrives af AI ud fra kuraterede fakta
              og personens biografi og er markeret som AI-genererede.
            </p>
            <p>
              Når du bruger »Spørg om …«, sendes dit spørgsmål og samtalen til AI-guiden, som svarer
              ud fra personens biografi, tidslinje og historiske fakta. Skriv ikke personlige
              oplysninger i dine spørgsmål. Samtalen gemmes kun på din telefon, mens appen er åben,
              og svar på de foreslåede spørgsmål genbruges for at spare tid.
            </p>
          </div>

          <h2>Privatliv</h2>
          <div className="card">
            <p>
              Du behøver ingen konto. Din historik, dine favoritter og din statistik ligger kun på
              din egen telefon og kan eksporteres eller slettes under Profil. Din placering bruges
              kun, hvis du giver lov, og sendes kun for at finde grave i nærheden, med en scanning
              eller med et bidrag. Den gemmes ikke.
            </p>
            <p>
              Vi viser kun personer, der har været døde i mindst 10 år (jf. databeskyttelseslovens §
              2, stk. 5), og som har offentlig interesse. Er du pårørende og ønsker en person
              fjernet, så skriv via »Foreslå en rettelse« på personens side.
            </p>
          </div>
        </div>
      </Page>
    </>
  );
}
