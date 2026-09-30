import { PageHeader } from '../components/PageHeader';

export function AboutPage() {
  return (
    <div className="profile-screen">
      <PageHeader title="Om MindSTEN" fallback="/profile" />
      <div className="prose">
        <h1 className="person-main-name">Enhver sten har en historie</h1>
        <p>
          MindSTEN gør et besøg på kirkegården til en rejse i tiden. Peg kameraet mod en gravsten,
          så læser appen navn og årstal, finder personen og viser, hvilken tid de levede i.
        </p>

        <h2>Hvor kommer oplysningerne fra?</h2>
        <ul>
          <li>
            <strong>Wikidata</strong> (CC0) — navne, datoer, gravsteder og koordinater for personer
            begravet i Danmark.
          </li>
          <li>
            <strong>Wikipedia på dansk</strong> (CC BY-SA 4.0) — biografiernes indledninger. Teksten
            er gengivet med kildehenvisning på hver person.
          </li>
          <li>
            <strong>Wikimedia Commons</strong> — portrætter under de licenser, der står på den
            enkelte fil.
          </li>
          <li>
            <strong>Redaktionelt udvalg</strong> — et kurateret startsæt af kendte danskere, samt
            tidslinjer og fakta om danmarkshistorien til Tidsvinduet.
          </li>
          <li>
            <strong>Kort</strong> © OpenStreetMaps bidragydere.
          </li>
        </ul>

        <h2>AI</h2>
        <p>
          Når du scanner, sendes billedet til Claude (Anthropic), som læser teksten på stenen.
          Billedet gemmes ikke. Tidsvinduets fortællinger skrives af AI ud fra kuraterede fakta og
          personens biografi og er markeret som AI-genererede.
        </p>

        <h2>Privatliv</h2>
        <p>
          Du behøver ingen konto. Din historik, favoritter og statistik ligger kun på din egen
          telefon og kan eksporteres eller slettes under Profil. Din placering bruges kun til at
          finde grave i nærheden og sendes kun med en scanning eller et bidrag.
        </p>
        <p>
          Vi viser kun personer, der har været døde i mindst 10 år (jf. databeskyttelseslovens § 2,
          stk. 5), og som har offentlig interesse. Er du pårørende og ønsker en person fjernet, så
          skriv via "Foreslå en rettelse" på personens side.
        </p>
      </div>
    </div>
  );
}
