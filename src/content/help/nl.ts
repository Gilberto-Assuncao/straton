import type { HelpPack } from "./types";

/** Nederlands. Zelfde secties, zelfde volgorde en dezelfde uitspraken als `en.ts`. */
export const nl: HelpPack = {
  worker: {
    title: "Jouw week, en jouw uren",
    audience: "Voor iedereen op de werf.",
    sections: [
      {
        heading: "Aanmelden",
        body: [
          "Open de klok, kies de werf als die nog niet vanuit je agenda is ingevuld, en druk op start. Druk op stop als je klaar bent. Meer is het niet, en het is gemaakt om met één hand te doen.",
          "Zet de klokpagina op het beginscherm van je telefoon en ze opent meteen op de knop, zonder de browser eromheen.",
          "Je telefoon kan vragen om zijn positie te delen. Die wordt één keer gebruikt, ter plekke, om één vraag te beantwoorden — gebeurt deze aanmelding op de werf? — en daarna weggegooid. STRATON bewaart niet waar je bent, en er is geen kolom in de databank die dat zou kunnen.",
        ],
      },
      {
        heading: "Je agenda",
        body: [
          "De week toont de opdrachten waarop je staat, met de uren en het adres. Verschuift een opdracht of wordt ze geannuleerd, dan krijg je een verwittiging — dat is het kanaal dat je op tijd bereikt.",
          "Je kunt je week ook in de agenda op je telefoon zetten: daarvoor is er een abonnementslink. Die werkt zichzelf bij, maar niet op de minuut — de agenda-app bepaalt zelf wanneer hij ophaalt, soms pas uren later. Een wijziging op het laatste moment bevestig je in de app, nooit in de agenda.",
          "Die link is een sleutel. Wie hem heeft, leest jouw planning zonder aan te melden. Stuur hem dus alleen naar jezelf, en trek hem in als hij zoekraakt. Het scherm toont wanneer hij laatst gelezen werd, en zo zou je het merken.",
        ],
      },
      {
        heading: "Zeggen wanneer je niet beschikbaar bent",
        body: [
          "Geef verlof, een opleidingsdag of een afwezigheid op bij Beschikbaarheid, en je ploegbaas ziet de data bij het plannen.",
          "Twee dingen zijn het waard om te weten. Het waarschuwt, het blokkeert niet: een ploegbaas kan je toch inplannen en krijgt te horen dat er een conflict is — soms gaat het verlof niet door, soms bied je jezelf aan, en dat beslist het systeem niet. En de notitie die je schrijft, wordt niet aan collega's getoond; zij zien de data, niet de reden.",
        ],
      },
      {
        heading: "Een shift ruilen",
        body: [
          "Bij elke opdracht waarop je staat, kun je een collega vragen ze over te nemen. Die moet eerst aanvaarden voor er iemand anders bij komt, en pas daarna kan een ploegbaas goedkeuren. Tot de ploegbaas goedkeurt, blijft de opdracht van jou.",
          "De collega gaat met opzet eerst: zonder dat kon iedereen zijn zaterdag doorschuiven naar iemand die er nooit mee ingestemd heeft.",
        ],
      },
      {
        heading: "Je urenstaat",
        body: [
          "De uren die je klokt worden een weekstaat. Jij dient ze in; je ploegbaas of het kantoor keurt ze goed. Eenmaal goedgekeurd is dat het record dat naar de loonverwerking gaat, dus kijk de week na voor je ze verstuurt.",
        ],
      },
    ],
  },

  supervisor: {
    title: "De week plannen",
    audience: "Voor ploegbazen en werfleiders.",
    sections: [
      {
        heading: "Werk inplannen",
        body: [
          "Maak een opdracht in de agenda: een titel, de uren, de werf, en wie erop staat. Iedereen die ingepland wordt, krijgt bericht.",
          "Je kunt mensen één voor één inplannen of een hele ploeg.",
        ],
      },
      {
        heading: "Een ploeg inplannen bevriest wie erin zat",
        body: [
          "Dit is de regel die mensen verrast, en ze is bewust. Een ploeg inplannen legt vast wie er op dat moment in zit. Wie de ploeg morgen verlaat, blijft op de opdracht van gisteren staan.",
          "Bereken je het lidmaatschap live, dan verandert de ploeg van een afgewerkte opdracht met terugwerkende kracht — en dan klopt de urenstaat niet meer met wie er echt op de werf stond. Voor de Belgische registratieplicht kan dat niet: er moet een record zijn van wie die dag was toegewezen.",
        ],
      },
      {
        heading: "Beschikbaarheid waarschuwt, ze blokkeert niet",
        body: [
          "Iemand inplannen die zich afwezig heeft gemeld mag, en je wordt verwittigd. Een ploegbaas die iets weet wat het systeem niet weet, mag er nooit door tegengehouden worden; wat niet mag gebeuren, is blind inplannen.",
          "Je ziet de data en het type. Je ziet de notitie over de reden niet.",
        ],
      },
      {
        heading: "Een opdracht verplaatsen",
        body: [
          "Gebruik Verplaatsen op de opdracht zelf. Alleen wat echt veranderd is, wordt aangekondigd: opslaan zonder iets aan te raken verwittigt niemand, en een uurwijziging en een werfwijziging zijn aparte verwittigingen omdat ze voor de ontvanger andere problemen zijn.",
          "De beschikbaarheid wordt opnieuw nagekeken op de nieuwe data. Wie om 7.30 u vrij was, is dat om 9.00 u misschien niet.",
        ],
      },
      {
        heading: "Shiftruil",
        body: [
          "Een arbeider vraagt het aan een collega; de collega aanvaardt; en pas dan komt het bij jou. Goedkeuren verschijnt pas nadat de collega aanvaard heeft — een overdracht goedkeuren waarvan één kant niets weet, is hoe iemand het op de dag zelf ontdekt.",
          "Je kunt op elk moment weigeren. Goedkeuren is het moment waarop de opdracht echt van eigenaar verandert, en beide mensen worden verwittigd.",
        ],
      },
      {
        heading: "Werfrapporten",
        body: [
          "Rapporten worden ingevuld op basis van een sjabloon dat je bedrijf zelf heeft geschreven. Ze gaan van ontwerp naar ingediend, en jij keurt ze goed of vraagt aanpassingen. De geschiedenis van wie wat deed blijft op het rapport staan.",
        ],
      },
    ],
  },

  manager: {
    title: "Het bedrijf runnen",
    audience: "Voor zaakvoerders, beheerders en kantoor.",
    sections: [
      {
        heading: "Instellen",
        body: [
          "Bij Instellingen staat het eigen record van het bedrijf — taal, tijdzone, standaardpauze — en de rechtenkaart die bepaalt wat elke rol mag doen.",
          "Voeg je mensen toe bij Personeel. Er vertrekt een uitnodiging per e-mail; zij kiezen zelf hun wachtwoord. Wie via een ander bedrijf al een STRATON-login heeft, krijgt geen e-mail, en dat is geen fout: die krijgt de link, die je kunt sturen zoals je gewoonlijk met hen praat.",
        ],
      },
      {
        heading: "Klanten: een bedrijf of een particulier",
        body: [
          "Een klant kan een geregistreerd bedrijf zijn of een particulier, en die keuze komt eerst omdat ze bepaalt wat er gevraagd wordt. Een bedrijf zoek je op naam in het Belgische register, en daar komen het btw-nummer en de zetel vandaan. Een particulier heeft dat allemaal niet, en het wordt ook niet gevraagd.",
          "Dat telt verder dan het formulier: de facturatie moet weten welk van de twee het is, want de btw-behandeling verschilt.",
        ],
      },
      {
        heading: "Een ander bedrijf uitnodigen",
        body: [
          "Een onderaannemer zonder STRATON-account kun je per e-mail uitnodigen. Met de link in die uitnodiging kan wie hem heeft een bedrijf aanmaken dat aan het jouwe gekoppeld is — het is dus een sleutel: stuur hem naar het bedrijf, niet naar een groepsgesprek.",
          "Hij vervalt, hij werkt één keer, en je kunt hem intrekken.",
        ],
      },
      {
        heading: "Delegeren is geen samenwerken",
        body: [
          "Dat zijn twee verschillende dingen, en het verschil is wie heeft toegestemd. Werk delegeren aan een ander bedrijf toont de opdrachtgever de stand van het werk — niet de mensen die het doen. Een bedrijf uitnodigen op een werf toont de stand én de ploeg, want dat bedrijf heeft de uitnodiging aanvaard.",
          "Een keten kan vijf niveaus diep gaan en kan niet op zichzelf terugkeren. Elk bedrijf ziet één niveau: wie het werk gaf, en aan wie het werd doorgegeven. Niet de hele keten.",
        ],
      },
      {
        heading: "Van de klok tot de loonbrief",
        body: [
          "Uren worden weekstaten, weekstaten worden goedgekeurd, en goedgekeurde uren voeden de loonperiode. Het rapport gewerkte uren exporteert als CSV, want een boekhouder heeft een bestand nodig en geen scherm.",
          "Het dashboard duidt aan wat aandacht vraagt: uren die afwijken van wat gepland was, mensen zonder registratie vandaag, staten die op goedkeuring wachten.",
        ],
      },
      {
        heading: "Wat STRATON niet doet",
        body: [
          "Het registreert wat mensen invoeren. Het gaat niet na of een arbeidstijdregistratie juist is, en het vervangt je eigen aangifte- en bewaarplichten niet — Dimona en de elektronische aanwezigheidsregistratie op grote werven horen niet bij het product.",
          "De controle op de inhoudingsplicht (artikel 30bis) linkt naar het officiële portaal. Het zegt je waar je moet kijken; het antwoordt niet in jouw plaats.",
        ],
      },
    ],
  },

  partner: {
    title: "Werken op de werf van een ander",
    audience: "Voor een bedrijf dat op een werf is uitgenodigd.",
    sections: [
      {
        heading: "De uitnodiging aanvaarden",
        body: [
          "De link die je kreeg maakt je bedrijf aan op STRATON, of koppelt het bedrijf dat je al hebt. Aanvaarden is de toestemming — er is geen tweede bevestiging, en het is wat de werf voor jou zichtbaar maakt.",
        ],
      },
      {
        heading: "Wat je ziet, en wat niet",
        body: [
          "Je ziet de werf waarvoor je bent uitgenodigd, en je eigen mensen erop. Je ziet niet de ploegen van andere bedrijven, niet de andere werven van de klant, niet zijn klantenbestand, en niets over zijn personeel.",
          "Die grens wordt door de databank afgedwongen, rij per rij, en niet door de schermen — daarom houdt ze stand, ook waar een interface ze zou kunnen vergeten.",
        ],
      },
      {
        heading: "Je mensen erop zetten",
        body: [
          "Zodra je aanvaard hebt, wijs je je eigen arbeiders aan de werf toe. Zij melden zich erop aan zoals bij elke andere opdracht, en de uren zijn de jouwe: ze verschijnen in jouw staten, niet in die van de opdrachtgever.",
        ],
      },
      {
        heading: "Wat de opdrachtgever van jou ziet",
        body: [
          "Is het werk aan jou gedelegeerd, dan ziet hij de stand — gepland, bezig, klaar — en niet wie je gestuurd hebt. Heeft hij je op de werf uitgenodigd, dan ziet hij daar ook je ploeg, want dat is wat je aanvaard hebt.",
          "Als dat verschil voor jou telt, is het de moeite waard te vragen welk van de twee je gekregen hebt voor je aanvaardt.",
        ],
      },
    ],
  },
};
