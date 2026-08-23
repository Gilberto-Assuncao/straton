import { LEGAL, type LegalPack } from "./types";

/** Dutch. Same sections, same order and same claims as `en.ts`. */
export const nl: LegalPack = {
  privacy: {
    title: "Privacyverklaring",
    summary: `Hoe STRATON met persoonsgegevens omgaat, en wat het bewust niet verzamelt.`,
    sections: [
      {
        heading: "Over wie dit gaat",
        body: [
          `STRATON is een platform voor personeelsbeheer voor bedrijven met ploegen op het terrein: aan- en afmelden, werven, planning, urenstaten en loonperiodes. Het wordt uitgebaat door ${LEGAL.operator}, bereikbaar op ${LEGAL.contactEmail}.`,
          `Er zijn twee verschillende verhoudingen, en juridisch zijn ze niet hetzelfde. Wanneer een bedrijf zich aanmeldt en STRATON gebruikt om zijn eigen mensen te beheren, beslist dat bedrijf wat over zijn werknemers wordt vastgelegd en waarom: het is de verwerkingsverantwoordelijke, en STRATON handelt in zijn opdracht als verwerker. Voor het account zelf — wie het heeft geopend, het adres waarnaar wij schrijven, wat aan support werd gevraagd — is STRATON de verwerkingsverantwoordelijke.`,
          `Een werknemer die zijn eigen gegevens wil laten verbeteren of verklaren, richt zich eerst tot zijn werkgever. De werkgever beslist; wij voeren die beslissing uit.`,
        ],
      },
      {
        heading: "Wat wordt vastgelegd",
        body: [
          `Account en identiteit: naam, e-mailadres, telefoonnummer indien opgegeven, voorkeurstaal en tijdzone, en de profielfoto als die wordt geüpload.`,
          `Tewerkstelling binnen een bedrijf op het platform: functie en functiebenaming, de rollen die bepalen wat iemand mag zien en doen, ploeglidmaatschap, en eventuele geregistreerde attesten — bijvoorbeeld VCA of BA5, met vervaldatum.`,
          `Werk: het moment waarop een shift begint en eindigt, pauzeminuten, notities die de persoon zelf typt, welke werf en welke onderverdeling daarvan, en aan welke taak of opdracht de uren toebehoren. Daaruit volgen de urenstaten, hun goedkeuringsstatus en de loonconsolidaties die erop gebouwd zijn.`,
          `Planning: opdrachten waarop iemand is ingepland, opgegeven beschikbaarheid en afwezigheden, voorgestelde en goedgekeurde shiftruilen, en de verwittigingen daarover.`,
          `Beheer: een auditspoor van belangrijke wijzigingen, en technische logs. Die logs bevatten een gebeurtenisnaam en identificatoren, nooit de inhoud van een record — welke velden gelogd mogen worden is een vaste lijst in de code.`,
        ],
      },
      {
        heading: "Locatie: wat niet wordt vastgelegd",
        body: [
          `STRATON slaat niet op waar een werknemer zich bevindt. Dat is het punt waarop systemen van dit type meestal de mist ingaan, dus staat het hier precies.`,
          `Wanneer iemand zich aanmeldt, kan zijn toestel zijn positie aanbieden. Die positie wordt één keer gebruikt, op dat moment, om één vraag te beantwoorden — gebeurt deze aanmelding op de werf? — en wordt daarna weggegooid. Wat naar de databank wordt geschreven is het antwoord: ja, nee, of onbekend, samen met een afstand afgerond op tien meter. Er is geen kolom voor de coördinaten van een werknemer, en de kolommen die ooit bestonden zijn verwijderd.`,
          `Het onderscheid doet ertoe. Een coördinaat zegt niet "op de werf Le Parc"; ze zegt waar deze persoon op die minuut was. Aanmelden van thuis, van een café, van een wachtzaal bij de dokter — het zou voor altijd in het dossier staan. De rechtmatige vraag van het bedrijf is aan welke werf de uren toebehoren, en om die te beantwoorden is geen spoor nodig.`,
          `Werven zelf hebben wél coördinaten. Die behoren het bedrijf toe — een werf wordt één keer ingevoerd, met haar adres — en daarop is de kaart gebouwd.`,
        ],
      },
      {
        heading: "Waarom het wordt bijgehouden",
        body: [
          `Om de dienst te leveren die de werkgever heeft gevraagd: uren registreren, werk plannen, urenstaten en loongegevens opmaken, en mensen laten weten wat er aan hun week verandert.`,
          `Omdat een werkgever eigen verplichtingen heeft. Registers van gepresteerde uren worden bijgehouden omdat de arbeids- en socialezekerheidswetgeving verlangt dat een werkgever ze kan voorleggen.`,
          `Om het platform werkend en veilig te houden: fouten opsporen, misbruik voorkomen, en kunnen reconstrueren wie wat heeft gewijzigd.`,
          `Voor een werknemer is toestemming doorgaans niet de grondslag, en dat is bewust: toestemming van een werknemer aan zijn werkgever is zwak, omdat de verhouding er geen is tussen gelijken. Wat gebeurt, is wat nodig is voor de arbeidsverhouding en om de wet na te leven.`,
        ],
      },
      {
        heading: "Wie het kan zien",
        body: [
          `Binnen een bedrijf: wat iemand ziet hangt af van zijn rol. Een werknemer ziet zijn eigen uren, zijn eigen planning en de werven waarop hij staat. Een ploegbaas ziet de ploeg waarvoor hij verantwoordelijk is. Een beheerder of loonrol ziet de gegevens van het bedrijf. Die grenzen worden door de databank zelf afgedwongen, rij per rij, niet enkel door de schermen.`,
          `Tussen bedrijven: niets steekt over. Waar twee bedrijven als partner of onderaannemer op dezelfde werf werken, ziet elk enkel wat die samenwerking vereist.`,
          `${LEGAL.operator}: medewerkers kunnen klantgegevens enkel bereiken wanneer dat nodig is om de dienst te laten werken of te herstellen, of wanneer de klant om hulp vraagt.`,
        ],
      },
      {
        heading: "Wie het nog verwerkt",
        body: [
          `Het platform draait op diensten van derden, elk handelend in onze opdracht: Supabase voor de databank, de authenticatie en de e-mailbezorging; Vercel voor het hosten van de toepassing; en MapTiler voor het kaartbeeld, dat bij het openen van een kaart een aanvraag ontvangt voor het gebied dat wordt bekeken, en geen informatie over wie kijkt.`,
          `Een actuele lijst van die dienstverleners en van waar zij gegevens verwerken is te verkrijgen via ${LEGAL.contactEmail}.`,
          `Eén geval wordt door de werknemer gekozen en niet door ons. Een werknemer kan voor zijn eigen planning een persoonlijke abonnementslink aanmaken. Voegt hij die toe aan Google Agenda, Outlook of een andere agenda, dan wordt zijn planning — de titel van de opdracht, de uren, het adres van de werf — door die aanbieder gelezen, onder diens eigen voorwaarden. Instructies en notities zitten nooit in die feed. De link kan op elk moment worden ingetrokken, en het platform toont wanneer hij laatst werd gelezen — dat is wat een gelekte link zichtbaar maakt voor wie hij toebehoort.`,
        ],
      },
      {
        heading: "Hoe lang het wordt bewaard",
        body: [
          `Registers van arbeidstijd worden bewaard zolang de werkgever ze nodig heeft om zijn eigen wettelijke verplichtingen na te komen — voor loon en sociale zekerheid gaat dat over jaren, niet over maanden.`,
          `Accountgegevens worden bewaard zolang het account in gebruik is. Verlaat een bedrijf het platform, dan worden zijn gegevens op verzoek verwijderd of teruggegeven.`,
          `Van een ingetrokken agenda-abonnement blijft enkel het feit dat het bestond en de digest van het adres — nooit het adres zelf — zodat een gelekte link nog onderzocht kan worden.`,
        ],
      },
      {
        heading: "Uw rechten",
        body: [
          `Wie gegevens bij ons heeft, kan een kopie vragen, verbetering vragen, verwijdering vragen, het gebruik laten beperken, zich tegen het gebruik verzetten, en de gegevens in overdraagbare vorm ontvangen.`,
          `Voor alles wat een werkgever via STRATON heeft vastgelegd, gaat de vraag naar die werkgever, die erover beslist. Voor het account zelf: ${LEGAL.contactEmail}.`,
          `Wie meent dat zijn gegevens verkeerd worden behandeld, kan klacht indienen bij de Gegevensbeschermingsautoriteit, Drukpersstraat 35, 1000 Brussel, of bij de toezichthouder van het land waar hij woont.`,
        ],
      },
      {
        heading: "Wijzigingen",
        body: [
          `De datum bovenaan deze pagina is de datum van de laatste inhoudelijke wijziging. Raakt een wijziging aan wat wordt verzameld of waarom, dan worden klanten vooraf verwittigd en niet achteraf.`,
        ],
      },
    ],
  },

  terms: {
    title: "Gebruiksvoorwaarden",
    summary: `De overeenkomst tussen ${LEGAL.operator} en een bedrijf dat STRATON gebruikt.`,
    sections: [
      {
        heading: "Waarover dit gaat",
        body: [
          `Deze voorwaarden beheersen het gebruik van STRATON, uitgebaat door ${LEGAL.operator}. Zij gelden voor het bedrijf dat een account opent en voor iedereen aan wie dat bedrijf toegang geeft.`,
          `Bestaat er een afzonderlijke ondertekende overeenkomst tussen ons en een klant, dan gaat die overeenkomst voor op wat hier staat.`,
        ],
      },
      {
        heading: "Accounts en toegang",
        body: [
          `Een bedrijfsaccount wordt geopend door iemand die het bedrijf mag verbinden. Dat bedrijf beslist wie nog toegang krijgt en met welke rol, en is verantwoordelijk voor wat die mensen ermee doen.`,
          `Toegangsgegevens zijn persoonlijk. Een login delen maakt het register van wie wat deed waardeloos — en dat is het enige wat een arbeidstijdsysteem zich niet kan permitteren te verliezen.`,
        ],
      },
      {
        heading: "Wat niet mag",
        body: [
          `Het platform gebruiken om uren of bewegingen te registreren van mensen die niet weten dat ze geregistreerd worden; proberen bij de gegevens van een ander bedrijf te komen; de dienst onderzoeken of aanvallen, behalve zoals beschreven onder verantwoorde melding op de beveiligingspagina; of toegang doorverkopen zonder schriftelijke overeenkomst.`,
        ],
      },
      {
        heading: "Uw gegevens blijven van u",
        body: [
          `Alles wat een klant in STRATON vastlegt, blijft van die klant. Wij gebruiken het om de dienst te leveren en voor niets anders: het wordt niet verkocht, niet gedeeld met andere klanten, en niet gebruikt om iets te trainen.`,
          `Op verzoek worden de gegevens van een klant in bruikbare vorm uitgevoerd of verwijderd.`,
        ],
      },
      {
        heading: "Beschikbaarheid",
        body: [
          `De dienst wordt geleverd zoals ze is, en wij werken eraan om ze beschikbaar en juist te houden. Deze voorwaarden beloven geen bepaalde beschikbaarheid; heeft een klant een verbintenis nodig over beschikbaarheid of reactietijd, dan wordt die afzonderlijk en schriftelijk afgesproken.`,
          `Onderhoud dat een onderbreking vraagt, wordt vooraf aangekondigd waar het planbaar is.`,
        ],
      },
      {
        heading: "Vergoedingen",
        body: [
          `Commerciële voorwaarden — prijs, factuurperiode, opzegtermijn — worden schriftelijk met elke klant afgesproken. Is er niets afgesproken, dan is er niets verschuldigd en ontstaat uit deze voorwaarden alleen geen betalingsverplichting.`,
        ],
      },
      {
        heading: "Beëindiging",
        body: [
          `Een klant kan op elk moment stoppen en zijn gegevens terugvragen of laten verwijderen.`,
          `Wij kunnen een account schorsen dat gebruikt wordt op een manier die deze voorwaarden schendt of andere klanten in gevaar brengt, en zeggen waarom. Schorsing is geen verwijdering: gegevens blijven lang genoeg bewaard om ze op te halen.`,
        ],
      },
      {
        heading: "Aansprakelijkheid",
        body: [
          `Niets in deze voorwaarden beperkt de aansprakelijkheid voor bedrog, voor opzet, of voor wat de wet niet laat beperken — met inbegrip van lichamelijke schade.`,
          `Daarbuiten, en voor zover de wet dat toelaat, is onze aansprakelijkheid beperkt tot de vergoedingen betaald in de twaalf maanden vóór het feit, en zijn wij niet aansprakelijk voor indirecte of gevolgschade.`,
          `STRATON registreert wat zijn gebruikers invoeren. Het gaat niet na of een arbeidstijdregistratie juist is, en het vervangt de eigen aangifte- en bewaarplichten van de werkgever niet.`,
        ],
      },
      {
        heading: "Wijzigingen aan deze voorwaarden",
        body: [
          `Wijzigingen worden op deze pagina gepubliceerd met een nieuwe datum. Een wijziging die de rechten van een klant wezenlijk raakt, wordt meegedeeld vóór ze ingaat.`,
        ],
      },
      {
        heading: "Recht en rechtbanken",
        body: [
          `Het Belgisch recht is van toepassing en de Belgische rechtbanken zijn bevoegd.`,
        ],
      },
    ],
  },

  security: {
    title: "Beveiliging",
    summary: `Hoe het platform de gegevens erin beschermt, en hoe u een probleem meldt.`,
    sections: [
      {
        heading: "Scheiding tussen bedrijven",
        body: [
          `Elke tabel in de databank dwingt row-level security af. Welke rijen een aanvraag mag lezen of schrijven, beslist de databank op basis van de identiteit van wie de aanvraag doet — niet de schermen, en niet de toepassingscode die omzeild zou kunnen worden.`,
          `Die scheiding wordt niet op vertrouwen aangenomen. Bij elke wijziging draait een aparte controle tegen een van nul opgebouwde databank en vraagt wie welke rij mag aanraken; ze doet op dit ogenblik 208 zulke vaststellingen, en een wijziging die de scheiding breekt raakt niet in productie.`,
        ],
      },
      {
        heading: "Toegangsgegevens en links",
        body: [
          `Wachtwoorden worden door Supabase Auth beheerd en worden nooit door de toepassing gezien.`,
          `Links die als toegangssleutel werken — een bedrijfsuitnodiging, een persoonlijk agenda-abonnement — zijn 32 willekeurige bytes, en enkel hun SHA-256-digest wordt bewaard. Een kopie van de databank is daardoor een lijst van verbruikte gissingen en geen verzameling werkende links. Een verkeerde link en een ingetrokken link zijn van buitenaf niet te onderscheiden, dus gissen levert niets op.`,
          `Een agenda-abonnement is alleen-lezen, bevat geen instructies of notities, kan op elk moment worden ingetrokken, en houdt bij wanneer het laatst gelezen werd — het enige wat een gelekte link zichtbaar maakt voor wie hij toebehoort.`,
        ],
      },
      {
        heading: "Wat niet wordt verzameld",
        body: [
          `Coördinaten van werknemers worden niet bewaard. Een aanmelding controleert of ze op de werf gebeurde en houdt enkel dat antwoord bij, met een afstand afgerond op tien meter. De kolommen die ooit posities bevatten zijn verwijderd; gegevens die niet worden bijgehouden, kunnen niet lekken.`,
        ],
      },
      {
        heading: "Logs en fouten",
        body: [
          `Logs bevatten een gebeurtenisnaam, een code en identificatoren, uit een vaste lijst toegelaten velden. Vrije inhoud reist niet mee: geen boodschap van de databank, geen inhoud van rijen, geen sleutel. Dat wordt in de code afgedwongen en niet aan gewoonte overgelaten, want de foutboodschap van een dienstverlener citeert de waarde die de fout veroorzaakte — en die waarde is wat iemand heeft ingetypt.`,
        ],
      },
      {
        heading: "Een kwetsbaarheid melden",
        body: [
          `Schrijf naar ${LEGAL.contactEmail} met genoeg detail om het probleem te reproduceren. Meldingen worden door een mens gelezen en beantwoord.`,
          `Testen op uw eigen account en de gegevens van uw eigen bedrijf is welkom. Testen dat de gegevens van een andere klant bereikt, de dienst voor anderen verstoort of via social engineering verloopt, is dat niet en valt niet onder de uitnodiging hierboven.`,
        ],
      },
    ],
  },
};
