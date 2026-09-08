export const DEMO_NOTICE = "Contenu à valider";

export type Signe = {
  slug: string;
  nom: string;
  numero: string;
  soustitre: string;
  presentation: string;
  signification: string;
  enseignements: string[];
  interdits: string[];
  recommandations: string[];
  correspondances: { cle: string; valeur: string }[];
  variantes: string[];
  membres: number;
  contributions: number;
};

const base = (
  slug: string,
  nom: string,
  numero: string,
  soustitre: string,
  membres: number,
  contributions: number,
): Signe => ({
  slug,
  nom,
  numero,
  soustitre,
  membres,
  contributions,
  presentation: `${nom} est une fiche de référence organisée pour la consultation des enseignements, interdits, recommandations et correspondances du signe.`,
  signification: `Ce signe est présenté autour des thèmes de ${soustitre.toLowerCase()}, avec un contenu structuré pour faciliter la lecture et la contribution validée.`,
  enseignements: [
    "Enseignement principal à consulter dans la fiche du signe.",
    "Point de compréhension complémentaire à relier au parcours du membre.",
    "Repère de lecture destiné à accompagner les contributions validées.",
  ],
  interdits: [
    "Interdit rapporté à documenter avec validation.",
    "Point de prudence à confirmer avant publication définitive.",
  ],
  recommandations: [
    "Recommandation à rattacher au contenu validé.",
    "Orientation de lecture pour les membres du même signe.",
    "Repère pratique à compléter lors de la validation éditoriale.",
  ],
  correspondances: [
    { cle: "Élément", valeur: "À valider" },
    { cle: "Période", valeur: "À valider" },
    { cle: "Couleur", valeur: "À valider" },
    { cle: "Jour", valeur: "À valider" },
  ],
  variantes: [
    "Variante régionale fictive A — formulation différente rapportée par des contributeurs.",
    "Variante régionale fictive B.",
  ],
});

export const signes: Signe[] = [
  base("gbe-medji", "Gbé Mêdji", "01", "Le mouvement et l'élan", 218, 12),
  base("yekou-medji", "Yèkou Mêdji", "02", "La patience et l'écoute", 176, 9),
  base("woli-medji", "Woli Mêdji", "03", "L'ordre et la justice", 154, 15),
  base("di-medji", "Di Mêdji", "04", "La sagesse contemplative", 131, 7),
  base("losso-medji", "Losso Mêdji", "05", "L'attachement et le soin", 142, 11),
  base("winlin-medji", "Winlin Mêdji", "06", "La lumière intérieure", 119, 6),
  base("abla-medji", "Abla Mêdji", "07", "La parole mesurée", 98, 5),
  base("aklan-medji", "Aklan Mêdji", "08", "La constance", 104, 8),
  base("guda-medji", "Guda Mêdji", "09", "Le renouvellement", 127, 10),
  base("sa-medji", "Sa Mêdji", "10", "La protection", 111, 4),
  base("ka-medji", "Ka Mêdji", "11", "La mémoire", 87, 6),
  base("trukpin-medji", "Trukpin Mêdji", "12", "L'endurance", 93, 3),
  base("tula-medji", "Tula Mêdji", "13", "L'équilibre", 108, 7),
  base("lete-medji", "Lètè Mêdji", "14", "La transmission", 96, 6),
  base("tche-medji", "Tchè Mêdji", "15", "Le discernement", 89, 5),
  base("fu-medji", "Fu Mêdji", "16", "L'accomplissement", 121, 9),
];

export const signeNoms = signes.map((s) => s.nom);

export type Membre = {
  id: string;
  pseudo: string;
  signe: string;
  annee: number;
  satisfaction: string;
  temoignage: string;
  memeSigne?: boolean;
  connexions: number;
};

export const membres: Membre[] = [
  {
    id: "segbo23",
    pseudo: "@Sègbo23",
    signe: "Gbé Mêdji",
    annee: 2016,
    satisfaction: "Satisfait",
    temoignage:
      "Depuis mon initiation, j'ai appris à mesurer mes décisions. Ce signe m'accompagne surtout dans les périodes de doute.",
    memeSigne: true,
    connexions: 84,
  },
  {
    id: "kondo",
    pseudo: "@Kondo",
    signe: "Gbé Mêdji",
    annee: 2019,
    satisfaction: "Très satisfait",
    temoignage:
      "Ce que j'ai reçu m'a donné un cadre. J'échange régulièrement avec des membres du même signe.",
    memeSigne: true,
    connexions: 51,
  },
  {
    id: "ayaba",
    pseudo: "@Ayaba",
    signe: "Yèkou Mêdji",
    annee: 2021,
    satisfaction: "Satisfait",
    temoignage: "J'ai enfin un espace pour poser mes questions sans crainte d'être jugée.",
    connexions: 39,
  },
  {
    id: "hounvi",
    pseudo: "@Hounvi",
    signe: "Woli Mêdji",
    annee: 2014,
    satisfaction: "Mitigé",
    temoignage:
      "Mon parcours a été long. Je partage ici mon expérience pour aider ceux qui hésitent.",
    connexions: 122,
  },
  {
    id: "dada90",
    pseudo: "@Dada90",
    signe: "Gbé Mêdji",
    annee: 2018,
    satisfaction: "Très satisfait",
    temoignage: "Le suivi que je reçois aujourd'hui n'a rien à voir avec mes débuts.",
    memeSigne: true,
    connexions: 66,
  },
  {
    id: "noukpo",
    pseudo: "@Noukpo",
    signe: "Fu Mêdji",
    annee: 2020,
    satisfaction: "Satisfait",
    temoignage: "J'apprécie la rigueur des contributions validées.",
    connexions: 45,
  },
  {
    id: "afiavi",
    pseudo: "@Afiavi",
    signe: "Losso Mêdji",
    annee: 2022,
    satisfaction: "Satisfait",
    temoignage: "Je découvre encore beaucoup de choses chaque semaine.",
    connexions: 28,
  },
  {
    id: "todan",
    pseudo: "@Todan",
    signe: "Guda Mêdji",
    annee: 2013,
    satisfaction: "Très satisfait",
    temoignage: "Dix ans après, je continue d'apprendre auprès des autres membres.",
    connexions: 190,
  },
];

export type Post = {
  id: string;
  authorId?: string;
  auteur: string;
  authorAvatarUrl?: string;
  signe?: string;
  type: "Membre" | "Témoignage" | "Pédagogie" | "Officiel" | "Signe" | "Question" | "Contribution";
  heure: string;
  contenu: string;
  image?: boolean;
  mediaUrl?: string;
  reactions: number;
  commentaires: Commentaire[];
  canEdit?: boolean;
};

export type Commentaire = {
  id: string;
  authorId?: string;
  auteur: string;
  authorAvatarUrl?: string;
  texte: string;
  heure: string;
  canDelete?: boolean;
};

export const posts: Post[] = [
  {
    id: "p1",
    auteur: "@Sègbo23",
    signe: "Gbé Mêdji",
    type: "Membre",
    heure: "il y a 2 h",
    contenu:
      "Première contribution validée aujourd'hui. Merci à la communauté pour l'écoute et la rigueur des relectures.",
    reactions: 42,
    commentaires: [
      { id: "c1", auteur: "@Ayaba", texte: "Félicitations, c'est mérité.", heure: "1 h" },
      { id: "c2", auteur: "@Kondo", texte: "Hâte de lire ça.", heure: "40 min" },
    ],
  },
  {
    id: "p2",
    auteur: "Ifawa · Officiel",
    type: "Officiel",
    heure: "il y a 6 h",
    contenu:
      "La section « Étude approfondie du signe » est ouverte cette semaine. Trois praticiens indépendants, un rapport comparatif remis sous 10 jours.",
    reactions: 128,
    commentaires: [],
  },
  {
    id: "p3",
    auteur: "@Ayaba",
    signe: "Yèkou Mêdji",
    type: "Témoignage",
    heure: "il y a 1 j",
    contenu:
      "« Depuis mon initiation, j'ai enfin un cadre pour comprendre ce que je vivais. » Je partage ici une réflexion sur la patience que mon signe m'a enseignée.",
    image: true,
    reactions: 73,
    commentaires: [{ id: "c3", auteur: "@Noukpo", texte: "Merci du partage.", heure: "20 h" }],
  },
  {
    id: "p4",
    auteur: "Ifawa · Pédagogie",
    type: "Pédagogie",
    heure: "il y a 1 j",
    contenu:
      "Comprendre les seize signes-mères : nous publions une fiche structurée par semaine, avec relecture et validation progressive.",
    reactions: 55,
    commentaires: [],
  },
  {
    id: "p5",
    auteur: "@Hounvi",
    signe: "Woli Mêdji",
    type: "Question",
    heure: "il y a 2 j",
    contenu:
      "Question à la communauté : comment avez-vous préparé votre première consultation ? Je cherche des retours concrets.",
    reactions: 19,
    commentaires: [
      { id: "c4", auteur: "@Todan", texte: "J'avais noté mes questions à l'avance.", heure: "1 j" },
    ],
  },
  {
    id: "p6",
    auteur: "@Dada90",
    signe: "Gbé Mêdji",
    type: "Contribution",
    heure: "il y a 3 j",
    contenu:
      "Ma contribution sur les variantes régionales de Gbé Mêdji vient d'être validée par l'équipe Ifawa.",
    reactions: 61,
    commentaires: [],
  },
];

export type Conversation = {
  id: string;
  pseudo: string;
  extrait: string;
  heure: string;
  nonLus: number;
  messages: { de: "moi" | "eux"; texte: string; heure: string }[];
};

export const conversations: Conversation[] = [
  {
    id: "kondo",
    pseudo: "@Kondo",
    extrait: "On échange demain si tu veux.",
    heure: "09:12",
    nonLus: 2,
    messages: [
      { de: "eux", texte: "Bonjour, j'ai vu que nous partageons le même signe.", heure: "08:40" },
      { de: "moi", texte: "Bonjour ! Oui, Gbé Mêdji. Depuis quand es-tu initié ?", heure: "08:44" },
      { de: "eux", texte: "2019. Et toi ?", heure: "08:45" },
      { de: "moi", texte: "2018. J'aimerais bien comparer nos expériences.", heure: "08:52" },
      { de: "eux", texte: "On échange demain si tu veux.", heure: "09:12" },
    ],
  },
  {
    id: "ayaba",
    pseudo: "@Ayaba",
    extrait: "Merci pour ton retour sur ma publication.",
    heure: "Hier",
    nonLus: 0,
    messages: [
      { de: "eux", texte: "Merci pour ton retour sur ma publication.", heure: "Hier" },
      { de: "moi", texte: "Avec plaisir, c'était très juste.", heure: "Hier" },
    ],
  },
  {
    id: "equipe",
    pseudo: "Ifawa · Support",
    extrait: "Votre consultation est en cours de traitement.",
    heure: "Lun",
    nonLus: 1,
    messages: [
      { de: "eux", texte: "Bonjour, votre demande a bien été reçue.", heure: "Lun" },
      { de: "eux", texte: "Votre consultation est en cours de traitement.", heure: "Lun" },
    ],
  },
  {
    id: "todan",
    pseudo: "@Todan",
    extrait: "Bienvenue parmi nous.",
    heure: "Dim",
    nonLus: 0,
    messages: [{ de: "eux", texte: "Bienvenue parmi nous.", heure: "Dim" }],
  },
];

export type Notification = {
  id: string;
  texte: string;
  heure: string;
  type: "connexion" | "commentaire" | "contribution" | "service" | "signe" | "message";
  conversationId?: string;
  nonLue: boolean;
};

export const notifications: Notification[] = [
  {
    id: "n1",
    texte: "@Kondo vous a envoyé une demande de connexion.",
    heure: "il y a 12 min",
    type: "connexion",
    nonLue: true,
  },
  {
    id: "n2",
    texte: "@Sègbo a commenté votre publication.",
    heure: "il y a 1 h",
    type: "commentaire",
    nonLue: true,
  },
  {
    id: "n3",
    texte: "Votre contribution a été validée.",
    heure: "il y a 5 h",
    type: "contribution",
    nonLue: true,
  },
  {
    id: "n4",
    texte: "Votre consultation est en cours de traitement.",
    heure: "hier",
    type: "service",
    nonLue: false,
  },
  {
    id: "n5",
    texte: "Votre rapport d'étude est disponible.",
    heure: "hier",
    type: "service",
    nonLue: false,
  },
  {
    id: "n6",
    texte: "Une nouvelle publication concerne votre signe.",
    heure: "il y a 2 j",
    type: "signe",
    nonLue: false,
  },
];

export const demandesConnexion = [
  { id: "kondo", pseudo: "@Kondo", motif: "Même signe que vous", signe: "Gbé Mêdji", annee: 2019 },
  {
    id: "afiavi",
    pseudo: "@Afiavi",
    motif: "Suggestion de la communauté",
    signe: "Losso Mêdji",
    annee: 2022,
  },
  {
    id: "noukpo",
    pseudo: "@Noukpo",
    motif: "Membre actif de la bibliothèque",
    signe: "Fu Mêdji",
    annee: 2020,
  },
];

export const services = [
  {
    slug: "consultation",
    titre: "Consultation Fa",
    icone: "compass",
    description: "Soumettez votre demande directement à Ifawa et recevez un retour structuré.",
  },
  {
    slug: "initiation",
    titre: "Demande d'initiation",
    icone: "sprout",
    description: "Être accompagné pas à pas dans la préparation et l'organisation.",
  },
  {
    slug: "etude",
    titre: "Étude approfondie du signe",
    icone: "layers",
    description: "Plusieurs avis indépendants réunis dans un rapport comparatif.",
  },
  {
    slug: "accompagnement",
    titre: "Accompagnement Fa",
    icone: "route",
    description: "Un suivi dans la durée, avec des questions incluses et des comptes rendus.",
  },
];

export const formulesConsultation = [
  {
    nom: "Standard",
    delai: "Jusqu'à 72 h",
    prix: "15 000 F",
    points: ["Retour écrit", "1 question de suivi", "Historique conservé"],
  },
  {
    nom: "Prioritaire",
    delai: "Jusqu'à 24 h",
    prix: "28 000 F",
    points: ["Retour écrit détaillé", "3 questions de suivi", "Traitement accéléré"],
    recommande: true,
  },
  {
    nom: "Express",
    delai: "Traitement prioritaire",
    prix: "45 000 F",
    points: ["Retour approfondi", "Questions illimitées 7 j", "Interlocuteur dédié"],
  },
];

export const formulesEtude = [
  {
    nom: "3 praticiens",
    delai: "10 jours",
    rapport: "Rapport comparatif simple",
    prix: "60 000 F",
  },
  {
    nom: "5 praticiens",
    delai: "15 jours",
    rapport: "Rapport comparatif étendu",
    prix: "95 000 F",
    recommande: true,
  },
  {
    nom: "7 praticiens",
    delai: "21 jours",
    rapport: "Rapport comparatif complet + synthèse",
    prix: "140 000 F",
  },
];

export const formulesAccompagnement = [
  {
    nom: "3 mois",
    questions: "6 questions incluses",
    suivi: "1 compte rendu mensuel",
    avantages: ["Dossier Fa personnel", "Carnet de parcours"],
    prix: "75 000 F",
  },
  {
    nom: "6 mois",
    questions: "15 questions incluses",
    suivi: "2 comptes rendus mensuels",
    avantages: ["Dossier Fa personnel", "Carnet de parcours", "1 étude de signe offerte"],
    prix: "135 000 F",
    recommande: true,
  },
  {
    nom: "12 mois",
    questions: "Questions illimitées",
    suivi: "Suivi continu",
    avantages: [
      "Dossier Fa personnel",
      "Carnet de parcours",
      "2 études de signe",
      "Interlocuteur dédié",
    ],
    prix: "240 000 F",
  },
];

export const timelineConsultation = [
  { etape: "Demande reçue", date: "12 août", fait: true },
  { etape: "Paiement confirmé", date: "12 août", fait: true },
  { etape: "En cours de traitement", date: "13 août", fait: true, actuel: true },
  { etape: "Résultat disponible", date: "—", fait: false },
  { etape: "Terminé", date: "—", fait: false },
];

export const carnet = [
  {
    date: "Septembre 2026",
    titre: "Initiation enregistrée",
    texte: "Votre signe Gbé Mêdji a été enregistré dans votre dossier.",
  },
  {
    date: "Octobre 2026",
    titre: "Étude approfondie",
    texte: "Étude à 3 praticiens commandée. Rapport disponible.",
  },
  {
    date: "Décembre 2026",
    titre: "Question de suivi",
    texte: "Question posée à votre accompagnateur, réponse reçue en 2 jours.",
  },
  {
    date: "Mars 2027",
    titre: "Intervention enregistrée",
    texte: "Intervention notée dans votre dossier Fa personnel.",
  },
];

export const partenaires = [
  {
    id: "PR-014",
    nom: "Interne — Atelier Nord",
    zone: "Zone 1",
    experience: "18 ans",
    dispo: "Disponible",
    statut: "Actif",
    dossiers: 4,
  },
  {
    id: "PR-027",
    nom: "Interne — Atelier Sud",
    zone: "Zone 3",
    experience: "11 ans",
    dispo: "Complet",
    statut: "Actif",
    dossiers: 9,
  },
  {
    id: "PR-031",
    nom: "Interne — Atelier Est",
    zone: "Zone 2",
    experience: "24 ans",
    dispo: "Disponible",
    statut: "Actif",
    dossiers: 2,
  },
  {
    id: "PR-042",
    nom: "Interne — Atelier Centre",
    zone: "Zone 1",
    experience: "7 ans",
    dispo: "En pause",
    statut: "Suspendu",
    dossiers: 0,
  },
];

export const consultationsAdmin = [
  {
    ref: "CS-2041",
    user: "@Sègbo23",
    offre: "Prioritaire",
    date: "13/08",
    statut: "En traitement",
    praticien: "PR-014",
  },
  {
    ref: "CS-2042",
    user: "@Ayaba",
    offre: "Standard",
    date: "13/08",
    statut: "En attente",
    praticien: "—",
  },
  {
    ref: "CS-2043",
    user: "@Kondo",
    offre: "Express",
    date: "12/08",
    statut: "Résultat prêt",
    praticien: "PR-031",
  },
  {
    ref: "CS-2044",
    user: "@Hounvi",
    offre: "Standard",
    date: "11/08",
    statut: "Terminé",
    praticien: "PR-027",
  },
  {
    ref: "CS-2045",
    user: "@Noukpo",
    offre: "Prioritaire",
    date: "11/08",
    statut: "En traitement",
    praticien: "PR-014",
  },
];

export const contributionsAdmin = [
  {
    id: "CB-311",
    membre: "@Dada90",
    signe: "Gbé Mêdji",
    categorie: "Variante",
    contenu: "Variante régionale rapportée par plusieurs anciens.",
    date: "13/08",
    statut: "En attente",
  },
  {
    id: "CB-312",
    membre: "@Todan",
    signe: "Guda Mêdji",
    categorie: "Enseignement",
    contenu: "Précision sur un enseignement transmis oralement.",
    date: "12/08",
    statut: "En attente",
  },
  {
    id: "CB-313",
    membre: "@Afiavi",
    signe: "Losso Mêdji",
    categorie: "Recommandation",
    contenu: "Recommandation d'usage courant dans sa région.",
    date: "12/08",
    statut: "Précision demandée",
  },
  {
    id: "CB-314",
    membre: "@Noukpo",
    signe: "Fu Mêdji",
    categorie: "Correspondance",
    contenu: "Correspondance rapportée, à croiser avec d'autres sources.",
    date: "10/08",
    statut: "En attente",
  },
];

export const decouverte = [
  {
    titre: "Qu'est-ce que le Fa ?",
    texte: "Une introduction claire, sans jargon, à ce que recouvre le Fa.",
  },
  { titre: "Comprendre les signes", texte: "Comment se structurent les seize signes-mères." },
  {
    titre: "Découvrir la communauté",
    texte: "Qui sont les membres d'Ifawa et comment ils échangent.",
  },
  {
    titre: "Explorer la bibliothèque",
    texte: "Parcourir les fiches et les contributions validées.",
  },
  {
    titre: "Comment se déroule une initiation ?",
    texte: "Les étapes, les questions fréquentes, ce qu'il faut savoir.",
  },
];

export const avisPraticiens = [
  {
    titre: "Avis du praticien 1",
    ref: "PR-014",
    texte: "Le praticien relève une orientation vers la mesure et la temporisation.",
  },
  {
    titre: "Avis du praticien 2",
    ref: "PR-031",
    texte:
      "Formulation proche de la première, avec un accent différent sur la question de la transmission familiale.",
  },
  {
    titre: "Avis du praticien 3",
    ref: "PR-027",
    texte:
      "Une variante régionale est signalée, ainsi qu'une recommandation qui n'apparaît pas dans les deux autres avis.",
  },
];

export const syntheseRapport = [
  {
    titre: "Points de forte convergence",
    items: ["Élément cité par les 3 praticiens.", "Second élément convergent."],
  },
  {
    titre: "Points rapportés par plusieurs praticiens",
    items: ["Élément cité par 2 praticiens sur 3."],
  },
  { titre: "Variantes", items: ["Variante régionale signalée par un seul praticien."] },
  { titre: "Divergences", items: ["Une divergence de formulation, sans opposition de fond."] },
  {
    titre: "Informations particulières",
    items: ["Une remarque isolée à conserver dans le dossier."],
  },
  { titre: "Éléments à approfondir", items: ["Deux points méritant une question de suivi."] },
];
