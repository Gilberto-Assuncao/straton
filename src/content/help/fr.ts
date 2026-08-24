import type { HelpPack } from "./types";

/** Français. Mêmes sections, même ordre et mêmes affirmations que `en.ts`. */
export const fr: HelpPack = {
  worker: {
    title: "Ta semaine, et tes heures",
    audience: "Pour tous ceux qui sont sur le terrain.",
    sections: [
      {
        heading: "Pointer",
        body: [
          "Ouvre le pointage, choisis le chantier s'il n'est pas déjà rempli depuis ton agenda, et appuie sur démarrer. Appuie sur arrêter quand tu as fini. C'est tout, et c'est fait pour se faire d'une seule main.",
          "Enregistre la page de pointage sur l'écran d'accueil du téléphone et elle s'ouvre directement sur le bouton, sans le navigateur autour.",
          "Le téléphone peut demander à partager sa position. Elle sert une fois, sur le moment, à répondre à une seule question — ce pointage a-t-il lieu sur le chantier ? — puis elle est jetée. STRATON ne garde pas où tu es, et aucune colonne de la base de données ne le pourrait.",
        ],
      },
      {
        heading: "Ton agenda",
        body: [
          "La semaine montre les chantiers sur lesquels tu es, avec les heures et l'adresse. Si un travail est déplacé ou annulé, tu reçois une notification — c'est le canal qui t'atteint à temps.",
          "Tu peux aussi mettre ta semaine dans le calendrier du téléphone : l'agenda propose une adresse d'abonnement pour ça. Elle se met à jour toute seule, mais pas à la minute — c'est l'application de calendrier qui décide quand elle va chercher, parfois des heures plus tard. Un changement de dernière minute se confirme dans l'application, jamais dans le calendrier.",
          "Cette adresse est une clé. Qui la détient lit ton planning sans se connecter, alors envoie-la seulement à toi-même, et révoque-la si elle s'égare. L'écran indique quand elle a été lue pour la dernière fois, et c'est ainsi que tu t'en apercevrais.",
        ],
      },
      {
        heading: "Dire quand tu n'es pas disponible",
        body: [
          "Déclare des congés, une formation ou une absence dans Disponibilité, et ton chef d'équipe voit les dates au moment de planifier.",
          "Deux choses à savoir. Cela avertit, cela ne bloque pas : un chef d'équipe peut quand même te planifier, et il est prévenu qu'il y a un conflit — parfois les congés tombent, parfois tu t'es proposé, et ce n'est pas au système d'en décider. Et la note que tu écris n'est pas montrée aux collègues : ils voient les dates, pas le motif.",
        ],
      },
      {
        heading: "Échanger un service",
        body: [
          "Sur n'importe quel travail où tu es, demande à un collègue de le reprendre. Il doit accepter avant que quelqu'un d'autre n'intervienne, et seulement ensuite un chef d'équipe peut approuver. Tant qu'il n'a pas approuvé, le travail reste le tien.",
          "Le collègue passe en premier volontairement : sans cela, n'importe qui pourrait refiler son samedi à quelqu'un qui n'a jamais accepté de le prendre.",
        ],
      },
      {
        heading: "Ta feuille d'heures",
        body: [
          "Les heures que tu pointes deviennent une feuille hebdomadaire. Tu la soumets ; ton chef d'équipe ou le bureau l'approuve. Une fois approuvée, c'est le relevé qui part à la paie : vérifie donc la semaine avant de l'envoyer.",
        ],
      },
    ],
  },

  supervisor: {
    title: "Planifier la semaine",
    audience: "Pour les chefs d'équipe et les conducteurs de chantier.",
    sections: [
      {
        heading: "Planifier du travail",
        body: [
          "Crée un travail dans l'agenda : un intitulé, les heures, le chantier, et qui y est. Toutes les personnes planifiées sont prévenues.",
          "Tu peux planifier personne par personne ou planifier une équipe entière.",
        ],
      },
      {
        heading: "Planifier une équipe fige qui en faisait partie",
        body: [
          "C'est la règle qui surprend, et elle est délibérée. Planifier une équipe enregistre les personnes qui en font partie à cet instant. Celui qui quitte l'équipe demain reste sur le travail pour lequel il a été planifié hier.",
          "Si l'on recalculait la composition en direct, l'équipe d'un travail terminé changerait rétroactivement — et la feuille d'heures cesserait de concorder avec qui était vraiment sur le chantier. Pour les registres exigés en Belgique, ce n'est pas acceptable : il doit exister une trace de qui était affecté ce jour-là.",
        ],
      },
      {
        heading: "La disponibilité avertit, elle ne bloque pas",
        body: [
          "Planifier quelqu'un qui s'est déclaré absent est permis, et tu es averti. Un chef d'équipe qui sait quelque chose que le système ignore ne doit jamais en être empêché ; ce qui ne doit pas arriver, c'est de planifier à l'aveugle.",
          "Tu vois les dates et le type. Tu ne vois pas la note écrite sur le motif.",
        ],
      },
      {
        heading: "Déplacer un travail",
        body: [
          "Utilise Reprogrammer sur le travail lui-même. Seul ce qui a réellement changé est annoncé : enregistrer sans rien toucher ne prévient personne, et un changement d'heure et un changement de chantier sont deux notifications distinctes parce que ce sont deux problèmes distincts pour celui qui les reçoit.",
          "La disponibilité est revérifiée sur les nouvelles dates. Quelqu'un de libre à 7 h 30 ne l'est peut-être pas à 9 h.",
        ],
      },
      {
        heading: "Échanges de services",
        body: [
          "Un ouvrier demande à un collègue ; le collègue accepte ; et ce n'est qu'ensuite que cela arrive chez toi. Approuver n'apparaît qu'une fois le collègue d'accord — approuver un transfert dont un côté ignore tout, c'est ainsi que quelqu'un l'apprend le jour même.",
          "Tu peux refuser à tout moment. Approuver est le moment où le travail change réellement de mains, et les deux personnes sont prévenues.",
        ],
      },
      {
        heading: "Rapports de chantier",
        body: [
          "Les rapports se remplissent à partir d'un modèle rédigé par ton entreprise. Ils passent de brouillon à soumis, et tu les approuves ou demandes des modifications. L'historique de qui a fait quoi reste sur le rapport.",
        ],
      },
    ],
  },

  manager: {
    title: "Gérer l'entreprise",
    audience: "Pour les gérants, les administrateurs et le bureau.",
    sections: [
      {
        heading: "Mise en place",
        body: [
          "Les Paramètres contiennent la fiche de l'entreprise — langue, fuseau horaire, pause par défaut — et la carte des permissions qui décide de ce que chaque rôle peut faire.",
          "Ajoutez vos collaborateurs sous Personnel. Une invitation part par e-mail ; ils choisissent eux-mêmes leur mot de passe. Celui qui possède déjà un accès STRATON via une autre entreprise ne reçoit pas d'e-mail, et ce n'est pas une erreur : il reçoit le lien, que vous pouvez lui envoyer comme vous lui parlez d'habitude.",
        ],
      },
      {
        heading: "Clients : une entreprise ou un particulier",
        body: [
          "Un client peut être une entreprise enregistrée ou un particulier, et ce choix vient en premier parce qu'il change ce qui est demandé. Une entreprise se cherche par son nom dans le registre belge, d'où viennent le numéro de TVA et le siège. Un particulier n'a rien de tout cela, et on ne le lui demande pas.",
          "Cela compte au-delà du formulaire : la facturation doit savoir de quoi il s'agit, car le traitement TVA n'est pas le même.",
        ],
      },
      {
        heading: "Inviter une autre entreprise",
        body: [
          "Un sous-traitant sans compte STRATON peut être invité par e-mail. Le lien de cette invitation permet à qui le détient de créer une entreprise liée à la vôtre : c'est donc une clé. Envoyez-le à l'entreprise, pas dans une conversation de groupe.",
          "Il expire, il fonctionne une seule fois, et vous pouvez le révoquer.",
        ],
      },
      {
        heading: "Déléguer n'est pas collaborer",
        body: [
          "Ce sont deux choses différentes, et la différence est qui a consenti. Déléguer un travail à une autre entreprise montre au donneur d'ordre l'état du travail — pas les personnes qui le font. Inviter une entreprise sur un chantier montre l'état et l'équipe, parce que cette entreprise a accepté l'invitation.",
          "Une chaîne peut compter cinq niveaux et ne peut pas boucler sur elle-même. Chaque entreprise voit un niveau : qui lui a donné le travail, et à qui elle l'a donné. Pas la chaîne entière.",
        ],
      },
      {
        heading: "Du pointage à la fiche de paie",
        body: [
          "Les heures deviennent des feuilles hebdomadaires, les feuilles sont approuvées, et les heures approuvées alimentent la période de paie. Le rapport des heures prestées s'exporte en CSV, parce qu'un comptable a besoin d'un fichier et non d'un écran.",
          "Le tableau de bord signale ce qui demande de l'attention : des heures qui s'écartent du prévu, des personnes sans relevé aujourd'hui, des feuilles en attente d'approbation.",
        ],
      },
      {
        heading: "Ce que STRATON ne fait pas",
        body: [
          "Il enregistre ce que les gens encodent. Il ne vérifie pas qu'un relevé de temps de travail est exact, et il ne remplace pas vos propres obligations de déclaration et de conservation — la Dimona et l'enregistrement électronique de présence sur les grands chantiers ne font pas partie du produit.",
          "Le contrôle de l'obligation de retenue (article 30bis) renvoie au portail officiel. Il vous dit où regarder ; il ne répond pas à votre place.",
        ],
      },
    ],
  },

  partner: {
    title: "Travailler sur le chantier d'un autre",
    audience: "Pour une entreprise invitée sur un chantier.",
    sections: [
      {
        heading: "Accepter l'invitation",
        body: [
          "Le lien reçu crée votre entreprise sur STRATON, ou rattache celle que vous avez déjà. Accepter est le consentement — il n'y a pas de seconde confirmation, et c'est ce qui rend le chantier visible pour vous.",
        ],
      },
      {
        heading: "Ce que vous voyez, et ce que vous ne voyez pas",
        body: [
          "Vous voyez le chantier sur lequel vous avez été invité, et vos propres gens dessus. Vous ne voyez pas les équipes des autres entreprises, ni les autres chantiers du client, ni son fichier clients, ni quoi que ce soit sur son personnel.",
          "Cette limite est imposée par la base de données, ligne par ligne, et non par les écrans — c'est pourquoi elle tient, même là où une interface pourrait l'oublier.",
        ],
      },
      {
        heading: "Y placer vos gens",
        body: [
          "Une fois l'invitation acceptée, affectez vos propres ouvriers au chantier. Ils y pointent comme sur n'importe quel autre travail, et les heures sont les vôtres : elles apparaissent dans vos feuilles, pas dans celles du donneur d'ordre.",
        ],
      },
      {
        heading: "Ce que le donneur d'ordre voit de vous",
        body: [
          "Si le travail vous a été délégué, il en voit l'état — planifié, en cours, terminé — et non qui vous avez envoyé. S'il vous a invité sur le chantier, il y voit aussi votre équipe, car c'est ce que vous avez accepté.",
          "Si cette distinction compte pour vous, il vaut la peine de demander laquelle des deux vous a été donnée avant d'accepter.",
        ],
      },
    ],
  },
};
