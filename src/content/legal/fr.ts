import { LEGAL, type LegalPack } from "./types";

/** French. Same sections, same order and same claims as `en.ts`. */
export const fr: LegalPack = {
  privacy: {
    title: "Déclaration de confidentialité",
    summary: `Comment STRATON traite les données à caractère personnel, et ce qu'il ne collecte délibérément pas.`,
    sections: [
      {
        heading: "De qui il s'agit",
        body: [
          `STRATON est une plateforme de gestion du personnel pour les entreprises de terrain : pointage, chantiers, planning, feuilles d'heures et périodes de paie. Elle est exploitée par ${LEGAL.operator}, joignable à ${LEGAL.contactEmail}.`,
          `Deux relations différentes sont couvertes ici, et elles ne sont pas les mêmes en droit. Lorsqu'une entreprise s'inscrit et utilise STRATON pour gérer son propre personnel, c'est elle qui décide de ce qui est enregistré sur ses travailleurs et pourquoi : elle est le responsable du traitement, et STRATON agit sur ses instructions en tant que sous-traitant. Pour le compte lui-même — qui l'a ouvert, l'adresse à laquelle nous écrivons, ce qui a été demandé au support — STRATON est le responsable du traitement.`,
          `Un travailleur qui souhaite faire corriger ou expliquer son propre dossier s'adresse d'abord à son employeur. L'employeur décide ; nous exécutons cette décision.`,
        ],
      },
      {
        heading: "Ce qui est enregistré",
        body: [
          `Compte et identité : nom, adresse e-mail, numéro de téléphone s'il est communiqué, langue et fuseau horaire préférés, et la photo de profil si elle est déposée.`,
          `Emploi au sein d'une entreprise sur la plateforme : fonction et intitulé de poste, les rôles qui déterminent ce que la personne peut voir et faire, l'appartenance à une équipe, et les attestations professionnelles enregistrées — par exemple VCA ou BA5, avec leur date d'expiration.`,
          `Travail : le moment où un service commence et se termine, les minutes de pause, les notes saisies par la personne, quel chantier et quelle subdivision de celui-ci, et à quelle tâche ou mission les heures se rapportent. De là découlent les feuilles d'heures, leur statut d'approbation et les consolidations de paie qui en sont tirées.`,
          `Planning : les missions sur lesquelles une personne est planifiée, les disponibilités et absences déclarées, les échanges de service proposés et approuvés, et les notifications qui les accompagnent.`,
          `Gestion : une trace d'audit des modifications importantes, et des journaux techniques. Ces journaux portent un nom d'événement et des identifiants, jamais le contenu d'un enregistrement — les champs pouvant être journalisés forment une liste fixe dans le code.`,
        ],
      },
      {
        heading: "Localisation : ce qui n'est pas enregistré",
        body: [
          `STRATON n'enregistre pas où se trouve un travailleur. C'est le point sur lequel les systèmes de ce type se trompent le plus souvent, il est donc énoncé précisément.`,
          `Lorsqu'une personne pointe, son téléphone peut proposer sa position. Cette position est utilisée une fois, sur le moment, pour répondre à une seule question — ce pointage a-t-il lieu sur le chantier ? — puis elle est jetée. Ce qui est écrit dans la base de données, c'est la réponse : oui, non, ou inconnu, accompagnée d'une distance arrondie à dix mètres. Il n'existe aucune colonne pour les coordonnées d'un travailleur, et celles qui ont existé ont été supprimées.`,
          `La distinction compte. Une coordonnée ne dit pas « sur le chantier Le Parc » ; elle dit où cette personne se trouvait, à cette minute-là. Pointer depuis chez soi, depuis un café, depuis une salle d'attente de médecin — cela resterait au dossier pour toujours. La question légitime de l'entreprise est de savoir à quel chantier les heures se rapportent, et y répondre n'exige aucune trace.`,
          `Les chantiers, eux, ont bien des coordonnées. Elles appartiennent à l'entreprise — un chantier est encodé une fois, avec son adresse — et c'est sur elles que la carte est construite.`,
        ],
      },
      {
        heading: "Pourquoi ces données sont conservées",
        body: [
          `Pour fournir le service demandé par l'employeur : enregistrer les heures, planifier le travail, produire les feuilles d'heures et les chiffres de paie, et prévenir les personnes de ce qui change dans leur semaine.`,
          `Parce qu'un employeur a ses propres obligations. Les relevés d'heures prestées sont conservés parce que le droit du travail et de la sécurité sociale exige que l'employeur puisse les produire.`,
          `Pour maintenir la plateforme en état de marche et sûre : diagnostiquer les pannes, empêcher les abus, et pouvoir reconstituer qui a modifié quoi.`,
          `Pour un travailleur, le consentement n'est généralement pas la base, et c'est délibéré : le consentement donné par un travailleur à son employeur est fragile, car la relation n'est pas entre égaux. Ce qui est fait est ce qui est nécessaire à la relation de travail et au respect de la loi.`,
        ],
      },
      {
        heading: "Qui peut les voir",
        body: [
          `Au sein d'une entreprise : ce que chacun voit dépend de son rôle. Un travailleur voit ses propres heures, son propre planning et les chantiers où il est affecté. Un chef d'équipe voit l'équipe dont il répond. Un administrateur ou un rôle paie voit les données de l'entreprise. Ces limites sont imposées par la base de données elle-même, ligne par ligne, et pas seulement par les écrans.`,
          `Entre entreprises : rien ne traverse. Lorsque deux entreprises travaillent sur le même chantier comme partenaires ou sous-traitants, chacune ne voit que ce que cette collaboration exige.`,
          `${LEGAL.operator} : le personnel n'accède aux données d'un client que lorsque c'est nécessaire pour faire fonctionner ou réparer le service, ou lorsque le client demande de l'aide.`,
        ],
      },
      {
        heading: "Qui d'autre les traite",
        body: [
          `La plateforme s'appuie sur des services fournis par des tiers, chacun agissant sur nos instructions : Supabase pour la base de données, l'authentification et l'envoi des e-mails ; Vercel pour l'hébergement de l'application ; et MapTiler pour les fonds de carte, qui reçoit à l'ouverture d'une carte une requête portant sur la zone consultée, et aucune information sur la personne qui la consulte.`,
          `Une liste à jour de ces prestataires et des lieux où ils traitent les données est disponible à ${LEGAL.contactEmail}.`,
          `Un cas est choisi par le travailleur et non par nous. Un travailleur peut générer un lien d'abonnement personnel à son propre planning. S'il l'ajoute à Google Agenda, Outlook ou un autre agenda, son planning — l'intitulé de la mission, les heures, l'adresse du chantier — est alors lu par ce fournisseur, selon les conditions de celui-ci. Les consignes et les notes ne figurent jamais dans ce flux. Le lien peut être révoqué à tout moment, et la plateforme indique quand il a été lu pour la dernière fois — c'est ce qui rend un lien ayant fuité visible pour celui à qui il appartient.`,
        ],
      },
      {
        heading: "Combien de temps elles sont conservées",
        body: [
          `Les relevés de temps de travail sont conservés aussi longtemps que l'employeur en a besoin pour satisfaire à ses propres obligations légales — en matière de paie et de sécurité sociale, cela se compte en années et non en mois.`,
          `Les données de compte sont conservées tant que le compte est utilisé. Lorsqu'une entreprise quitte la plateforme, ses données sont supprimées ou restituées sur demande.`,
          `D'un abonnement d'agenda révoqué ne subsistent que le fait qu'il a existé et l'empreinte de son adresse — jamais l'adresse elle-même — afin qu'un lien ayant fuité puisse encore être examiné.`,
        ],
      },
      {
        heading: "Vos droits",
        body: [
          `Toute personne dont les données sont conservées peut en demander une copie, en demander la correction, en demander l'effacement, en faire limiter l'usage, s'opposer à cet usage, et demander à les recevoir sous une forme portable.`,
          `Pour tout ce qu'un employeur a enregistré via STRATON, la demande s'adresse à cet employeur, qui la tranche. Pour le compte lui-même : ${LEGAL.contactEmail}.`,
          `Toute personne qui estime que ses données sont mal traitées peut introduire une plainte auprès de l'Autorité de protection des données, rue de la Presse 35, 1000 Bruxelles, ou auprès de l'autorité de contrôle du pays où elle réside.`,
        ],
      },
      {
        heading: "Modifications",
        body: [
          `La date en haut de cette page est celle de la dernière modification de fond. Lorsqu'une modification touche à ce qui est collecté ou à sa finalité, les clients en sont informés avant qu'elle ne prenne effet, et non après.`,
        ],
      },
    ],
  },

  terms: {
    title: "Conditions d'utilisation",
    summary: `L'accord entre ${LEGAL.operator} et une entreprise qui utilise STRATON.`,
    sections: [
      {
        heading: "Ce que couvrent ces conditions",
        body: [
          `Ces conditions régissent l'utilisation de STRATON, exploité par ${LEGAL.operator}. Elles s'appliquent à l'entreprise qui ouvre un compte et à toute personne à qui elle donne accès.`,
          `Lorsqu'un accord signé distinct existe entre nous et un client, cet accord prévaut sur ce qui est écrit ici.`,
        ],
      },
      {
        heading: "Comptes et accès",
        body: [
          `Un compte d'entreprise est ouvert par une personne habilitée à l'engager. Cette entreprise décide qui d'autre y accède et avec quel rôle, et répond de ce que ces personnes en font.`,
          `Les identifiants sont personnels. Partager un accès rend sans valeur le relevé de qui a fait quoi — la seule chose qu'un système de temps de travail ne peut pas se permettre de perdre.`,
        ],
      },
      {
        heading: "Ce qui est interdit",
        body: [
          `Utiliser la plateforme pour enregistrer les heures ou les déplacements de personnes qui n'ont pas été informées qu'elles le sont ; tenter d'atteindre les données d'une autre entreprise ; sonder ou attaquer le service, sauf comme décrit sous la divulgation responsable en page sécurité ; ou revendre l'accès sans accord écrit.`,
        ],
      },
      {
        heading: "Vos données restent les vôtres",
        body: [
          `Tout ce qu'un client enregistre dans STRATON lui appartient. Nous l'utilisons pour fournir le service et pour rien d'autre : il n'est ni vendu, ni partagé avec d'autres clients, ni utilisé pour entraîner quoi que ce soit.`,
          `Sur demande, les données d'un client sont exportées sous une forme exploitable ou supprimées.`,
        ],
      },
      {
        heading: "Disponibilité",
        body: [
          `Le service est fourni tel qu'il est, et nous travaillons à le maintenir disponible et correct. Ces conditions ne promettent aucun taux de disponibilité ; lorsqu'un client a besoin d'un engagement sur la disponibilité ou sur les délais de réponse, il est convenu séparément et par écrit.`,
          `Une maintenance nécessitant une interruption est annoncée à l'avance lorsqu'elle peut être planifiée.`,
        ],
      },
      {
        heading: "Redevances",
        body: [
          `Les conditions commerciales — prix, périodicité, préavis — sont convenues par écrit avec chaque client. À défaut d'accord, rien n'est dû et ces conditions seules ne créent aucune obligation de paiement.`,
        ],
      },
      {
        heading: "Fin de la relation",
        body: [
          `Un client peut cesser d'utiliser le service à tout moment et demander la restitution ou la suppression de ses données.`,
          `Nous pouvons suspendre un compte utilisé d'une manière qui viole ces conditions ou met en danger d'autres clients, en disant pourquoi. Suspendre n'est pas supprimer : les données sont conservées assez longtemps pour être récupérées.`,
        ],
      },
      {
        heading: "Responsabilité",
        body: [
          `Rien dans ces conditions ne limite la responsabilité en cas de fraude, de faute intentionnelle, ou pour ce que la loi ne permet pas de limiter — en ce compris les dommages corporels.`,
          `Au-delà, et dans la mesure permise par la loi, notre responsabilité est limitée aux redevances payées pour le service durant les douze mois précédant le fait, et nous ne répondons pas des dommages indirects ou consécutifs.`,
          `STRATON enregistre ce que ses utilisateurs encodent. Il ne vérifie pas l'exactitude d'un relevé de temps de travail et ne remplace pas les obligations propres de l'employeur en matière de déclaration et de conservation.`,
        ],
      },
      {
        heading: "Modification des conditions",
        body: [
          `Les modifications sont publiées sur cette page avec une nouvelle date. Une modification qui affecte substantiellement les droits d'un client est communiquée avant sa prise d'effet.`,
        ],
      },
      {
        heading: "Droit applicable et tribunaux",
        body: [
          `Le droit belge s'applique et les tribunaux belges sont compétents.`,
        ],
      },
    ],
  },

  security: {
    title: "Sécurité",
    summary: `Comment la plateforme protège les données qu'elle contient, et comment signaler un problème.`,
    sections: [
      {
        heading: "Séparation entre entreprises",
        body: [
          `Chaque table de la base de données applique la sécurité au niveau des lignes. Les lignes qu'une requête peut lire ou écrire sont déterminées par la base elle-même, à partir de l'identité de celui qui la formule — pas par les écrans, ni par un code applicatif qui pourrait être contourné.`,
          `Cette séparation n'est pas tenue pour acquise. À chaque modification, un contrôle dédié s'exécute contre une base reconstruite de zéro et demande qui peut toucher quelle ligne ; il pose actuellement 208 constats de ce type, et une modification qui casse l'isolation n'atteint pas la production.`,
        ],
      },
      {
        heading: "Identifiants et liens",
        body: [
          `Les mots de passe sont gérés par Supabase Auth et ne sont jamais vus par l'application.`,
          `Les liens qui font office d'identifiant — une invitation d'entreprise, un abonnement personnel à l'agenda — sont 32 octets aléatoires, et seule leur empreinte SHA-256 est conservée. Une copie de la base est donc une liste de tentatives dépensées et non un jeu de liens fonctionnels. Un lien erroné et un lien révoqué sont indiscernables de l'extérieur : deviner n'apprend rien.`,
          `Un abonnement d'agenda est en lecture seule, ne contient ni consignes ni notes, peut être révoqué à tout moment, et retient la date de sa dernière lecture — la seule chose qui rende visible, pour celui à qui il appartient, un lien ayant fuité.`,
        ],
      },
      {
        heading: "Ce qui n'est pas collecté",
        body: [
          `Les coordonnées des travailleurs ne sont pas conservées. Un pointage vérifie s'il a eu lieu sur le chantier et ne garde que cette réponse, avec une distance arrondie à dix mètres. Les colonnes qui contenaient autrefois des positions ont été supprimées ; des données qui ne sont pas conservées ne peuvent pas fuiter.`,
        ],
      },
      {
        heading: "Journaux et erreurs",
        body: [
          `Les journaux portent un nom d'événement, un code et des identifiants, issus d'une liste fixe de champs autorisés. Le contenu libre ne voyage pas : aucun message de la base de données, aucun contenu de ligne, aucune clé. Cela est imposé dans le code plutôt que laissé à l'habitude, car le message d'erreur d'un prestataire recopie la valeur qui l'a provoqué — et cette valeur est ce que quelqu'un a saisi.`,
        ],
      },
      {
        heading: "Signaler une vulnérabilité",
        body: [
          `Écrivez à ${LEGAL.contactEmail} avec assez de détails pour reproduire le problème. Les signalements sont lus par une personne et reçoivent une réponse.`,
          `Tester sur votre propre compte et les données de votre propre entreprise est bienvenu. Tester d'une manière qui atteint les données d'un autre client, dégrade le service pour d'autres, ou passe par l'ingénierie sociale ne l'est pas, et n'est pas couvert par l'invitation ci-dessus.`,
        ],
      },
    ],
  },
};
