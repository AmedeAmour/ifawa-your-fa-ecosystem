"""Build editorial dossiers for the 230 derived Fa signs described in the PDF.

Public copy is written from extracted facts instead of copied sentences.
Source provenance and similarity scores remain in the private report.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "references" / "Les 256 signe .pdf"
CATALOG = ROOT / "src" / "data" / "fa-sign-names.json"
CORPUS = ROOT / "src" / "data" / "fa-corpus.json"
REPORT = ROOT / "references" / "fa-derived-generation-report.json"
CURATED_SLUGS = {"signe-017-gbe-yeku", "signe-018-gbe-woli"}

HOUSE_NAMES = {
    "GBE": "Gbè", "YEKU": "Yèku", "WOLI": "Woli", "DI": "Di",
    "LOSO": "Loso", "WINLIN": "Winlin", "ABLA": "Abla", "AKLAN": "Aklan",
    "GUDA": "Guda", "GOUDA": "Guda", "SA": "Sa", "TRUKPIN": "Trukpin",
    "TOULA": "Tula", "TULA": "Tula", "LETE": "Lètè", "LETA": "Lètè",
    "KA": "Ka", "TCHE": "Tchè", "TCHEOGBE": "Tchè", "FU": "Fu",
}

# pattern, key, profile sentence, concise devise, interpretation
MOTIFS = [
    (r"mort|mour|tuer|cadavre|cercueil|danger|accident", "danger",
     "Le signe place la préservation de la vie au premier plan et demande de reconnaître le danger avant qu'il ne devienne irréversible.",
     "La vigilance protège la vie", "Le danger perd une part de sa force lorsqu'il est reconnu tôt et traité avec calme."),
    (r"trah|pi[eè]ge|maniganc|tromp|ruse|ennemi", "trahison",
     "Une confiance mal placée peut exposer le porteur à la ruse ou à la trahison ; il lui faut observer les actes autant que les paroles.",
     "La confiance se donne avec discernement", "La loyauté se vérifie dans les actes. Le signe invite à rester ouvert sans ignorer les indices d'une intention cachée."),
    (r"rival|concurr|combat|guerre|dispute|tirail|querell", "conflit",
     "Les rivalités annoncées doivent être contenues par la mesure, car une victoire obtenue dans la colère peut détruire l'équilibre du groupe.",
     "Deux forces opposées doivent retrouver la mesure", "Le conflit devient fécond lorsque chacun renonce à l'escalade et recherche une solution juste."),
    (r"rich|prosp|fortune|argent|bien|bonheur", "prospérité",
     "La prospérité est possible, mais sa durée dépend d'une gestion honnête des biens et du respect des engagements pris.",
     "La richesse demande une conduite juste", "L'abondance demeure favorable lorsqu'elle circule sans orgueil, tromperie ni abus de pouvoir."),
    (r"roi|chef|tr[oô]ne|autorit|collectivit|couronne", "autorité",
     "Une fonction d'autorité peut se présenter. Elle doit servir la communauté et s'exercer sans précipitation ni domination.",
     "Le commandement se prouve par l'équité", "Diriger engage la responsabilité du porteur envers ceux qui dépendent de ses décisions."),
    (r"femme|mari|foyer|enfant|famille|fils|fille", "famille",
     "La vie familiale constitue un lieu d'épreuve et d'accomplissement ; le dialogue, la fidélité et le respect des proches y sont déterminants.",
     "La paix du foyer se construit", "Les liens familiaux se consolident par la patience, la parole tenue et la protection réciproque."),
    (r"p[eè]re|m[eè]re|parent|a[iî]n[eé]|vieillard", "aînés",
     "Le signe rappelle les devoirs envers les parents et les aînés, dont l'expérience peut prévenir des décisions lourdes de conséquences.",
     "La parole des aînés éclaire le chemin", "Écouter ceux qui précèdent permet de reconnaître un danger déjà rencontré par la communauté."),
    (r"parol|bouche|secret|bavard|silence|dire|voix", "parole",
     "La parole possède ici un pouvoir particulier : une confidence révélée, une promesse rompue ou un propos irréfléchi peut bouleverser une destinée.",
     "La parole mesurée préserve", "Le silence et la discrétion protègent ce qui doit mûrir avant d'être rendu public."),
    (r"col[eè]re|[eé]nerver|violent|bagarre", "colère",
     "La colère rapide est présentée comme une faiblesse dangereuse. Le porteur gagne à différer sa réaction et à retrouver son jugement.",
     "La colère ne doit pas décider", "Prendre le temps de se calmer évite qu'une offense passagère produise un dommage durable."),
    (r"voyag|[eé]tranger|route|chemin|d[eé]plac", "déplacement",
     "Les déplacements exigent préparation et prudence. Un changement de lieu peut ouvrir une possibilité tout en exposant à l'isolement.",
     "Le voyage commence par la préparation", "Changer de lieu devient favorable lorsque les obligations sont accomplies et que la route est choisie avec discernement."),
    (r"travail|cultiv|champ|r[eé]colt|effort", "travail",
     "Le résultat annoncé dépend d'un effort régulier. La patience et la constance valent davantage qu'une réussite recherchée dans la précipitation.",
     "Le travail patient porte son fruit", "Une œuvre durable se construit par des gestes répétés, ordonnés et conduits jusqu'à leur terme."),
    (r"pluie|eau|rivi[eè]re|mer|douche", "eau",
     "L'eau marque une transformation : ce qui apporte la vie peut aussi surprendre une personne insuffisamment préparée.",
     "L'eau transforme ce qu'elle touche", "Toute force bénéfique demande une juste préparation afin que son passage nourrisse au lieu de désorganiser."),
    (r"malad|souffr|sant[eé]|gu[eé]ri", "santé",
     "La santé demande une attention précoce. Le signe déconseille de minimiser les symptômes ou de retarder les soins nécessaires.",
     "Le corps avertit avant de céder", "Écouter les premiers signes de faiblesse permet d'agir avant que l'épreuve ne s'aggrave."),
    (r"grossesse|enceinte|accouch|avort", "maternité",
     "La maternité et la naissance appellent une protection particulière, ainsi que le respect strict des recommandations reçues.",
     "La naissance se protège avec attention", "La vie en formation demande prudence, accompagnement et accomplissement des obligations indiquées."),
    (r"sorc|az[eé]|mauvais sort|envo[uû]t", "forces hostiles",
     "Le signe appelle à se protéger des influences hostiles sans nourrir la peur ni répondre à l'agression par l'imprudence.",
     "La protection exige lucidité", "La prudence, la discrétion et le respect des obligations forment une défense plus sûre que la provocation."),
    (r"justice|honn[eê]te|vol|voleur|mensong", "intégrité",
     "L'intégrité constitue une protection essentielle. Le gain obtenu par le mensonge ou l'appropriation du bien d'autrui finit par fragiliser son auteur.",
     "Le bien d'autrui ne fonde aucune réussite", "La prospérité durable se construit par l'honnêteté et le respect des droits de chacun."),
    (r"ami|amiti[eé]|compagnon", "amitié",
     "Les relations d'amitié sont mises à l'épreuve. Le porteur doit distinguer la solidarité véritable d'une proximité intéressée.",
     "L'amitié se reconnaît dans l'épreuve", "Un compagnon loyal protège et conseille ; une relation fondée sur l'intérêt se révèle lorsque survient le danger."),
    (r"sacrifice|offrande|adorer|prendre soin|s'occuper", "obligations",
     "L'accomplissement des obligations indiquées est associé à l'apaisement, à la protection et au rétablissement de l'équilibre.",
     "L'obligation accomplie rétablit l'équilibre", "Le signe relie le mieux-être à une action concrète, menée avec sérieux et continuité."),
]

DEITY_ALIASES = {
    "Aïzan": ["aïzan", "aizan"], "Dan": [" dan ", "serpent"],
    "Faïdékouin": ["faïdékouin", "fayidekouin"], "Gu": [" gou ", " gu "],
    "Hêviosso": ["hêviosso", "heviosso", "hoviosso"], "Hoho": ["hoho", "jumeaux"],
    "Kinnessi": ["kinnessi"], "Kluvito": ["kluvito", "klouvito"],
    "Lègba": ["lègba", "legba"], "Lissa": ["lissa"], "Mawu": ["mawu"],
    "Minonnan": ["minonnan", "minon nan"], "Sakpata": ["sakpata"],
    "Tohossou": ["tohossou", "tohosso"], "Yalodé": ["yalodé", "yalode"],
}

TABOO_OBJECTS = [
    (r"huile rouge", "Consommer de l'huile rouge"), (r"sodabi", "Boire du sodabi"),
    (r"crabe", "Manger du crabe"), (r"viande de b[œo]uf|b[œo]uf", "Manger de la viande de bœuf"),
    (r"gombo", "Manger du gombo"), (r"gazelle", "Manger de la gazelle"),
    (r"igname", "Manger de l'igname"), (r"akassa", "Manger de l'akassa"),
    (r"serpent", "Manger du serpent"), (r"chien", "Manger du chien"),
    (r"porc|cochon", "Manger du porc"), (r"cabri", "Manger du cabri"),
    (r"mouton|b[eé]lier", "Manger du mouton"), (r"poulet|coq|poule", "Manger du poulet"),
    (r"tourterelle", "Manger de la tourterelle"), (r"pigeon", "Manger du pigeon"),
    (r"poisson", "Manger le poisson indiqué par le signe"), (r"escargot", "Manger de l'escargot"),
    (r"haricot", "Manger du haricot"), (r"ma[iï]s", "Manger du maïs"),
    (r"tenues? rouges?|v[eê]tements? rouges?", "Porter des vêtements rouges"),
    (r"tenues? noires?|v[eê]tements? noirs?", "Porter des vêtements noirs"),
]

IMAGE_TERMS = [
    (r"b[eé]lier", "le bélier"), (r"b[œo]uf", "le bœuf"), (r"chien", "le chien"),
    (r"chat", "le chat"), (r"lion", "le lion"), (r"l[eé]opard", "le léopard"),
    (r"serpent", "le serpent"), (r"gazelle", "la gazelle"), (r"oiseau", "l'oiseau"),
    (r"poule|poulet|coq", "la volaille"), (r"pigeon", "le pigeon"),
    (r"tourterelle", "la tourterelle"), (r"escargot", "l'escargot"),
    (r"poisson", "le poisson"), (r"singe", "le singe"), (r"rat", "le rat"),
    (r"crocodile", "le crocodile"), (r"[eé]l[eé]phant", "l'éléphant"),
    (r"araign[eé]e", "l'araignée"), (r"termite", "la termite"),
    (r"fourmi", "la fourmi"), (r"abeille", "l'abeille"),
    (r"arbre", "l'arbre"), (r"feuille", "la feuille"), (r"for[eê]t", "la forêt"),
    (r"champ", "le champ"), (r"terre", "la terre"), (r"montagne", "la montagne"),
    (r"rivi[eè]re", "la rivière"), (r"mer", "la mer"), (r"pluie", "la pluie"),
    (r"feu", "le feu"), (r"vent", "le vent"), (r"soleil", "le soleil"),
    (r"lune", "la lune"), (r"maison", "la maison"), (r"village", "le village"),
    (r"palais", "le palais"), (r"tr[oô]ne", "le trône"), (r"route|chemin", "le chemin"),
    (r"march[eé]", "le marché"), (r"cercueil", "le cercueil"), (r"tombe", "la tombe"),
    (r"tambour|tam-tam", "le tambour"), (r"pagne", "le pagne"),
    (r"calebasse", "la calebasse"), (r"corde", "la corde"), (r"couteau", "le couteau"),
    (r"houe", "la houe"), (r"argent", "l'argent"), (r"cauris?", "les cauris"),
    (r"igname", "l'igname"), (r"ma[iï]s", "le maïs"), (r"haricot", "le haricot"),
]

EVENTS = [
    (r"sacrifice|offrande", "l'accomplissement d'une obligation rituelle"),
    (r"consult(?:e|er|ation)|prendre le F[ÂA]", "une consultation destinée à éclairer une décision"),
    (r"tuer|mort|mour|cadavre|cercueil", "une épreuve où la vie et la mort sont mises en balance"),
    (r"trah|pi[eè]ge|tromp|ruse|maniganc", "une manœuvre cachée qui met la loyauté à l'épreuve"),
    (r"voyag|[eé]tranger|route|chemin", "un déplacement qui oblige à choisir sa direction avec soin"),
    (r"mari|femme|foyer", "une tension familiale qui révèle les devoirs de chacun"),
    (r"roi|chef|tr[oô]ne", "une question d'autorité, de succession ou de gouvernement"),
    (r"dispute|combat|guerre|rival|concurr", "une opposition dont l'issue dépend de la maîtrise de soi"),
    (r"argent|rich|prosp|fortune", "une recherche de prospérité qui éprouve l'intégrité"),
    (r"malad|souffr|gu[eé]ri", "une fragilité qui demande protection et soin"),
]


def clean(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("’", "'")
    value = re.sub(r"=== PAGE \d+ ===", " ", value)
    value = re.sub(r"(?m)^\s*\d{1,3}\s*$", " ", value)
    value = re.sub(r"\s+", " ", value).strip(" \n\r")
    return re.sub(r"\s+([,.;:!?])", r"\1", value)


def fold(value: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", value.lower()) if unicodedata.category(c) != "Mn")


def extract_sections() -> dict[int, str]:
    text = "\n".join(page.extract_text() or "" for page in PdfReader(PDF).pages)
    text = re.sub(r"(?m)^\s*\d{1,3}\s*$", "", text)
    headings = list(re.finditer(r"(?m)^\s*(\d{1,3})\s*[-–]\s*(.+?)\s*$", text))
    sections: dict[int, str] = {}
    for index, match in enumerate(headings):
        number = int(match.group(1))
        if 17 <= number <= 246:
            end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
            sections[number] = clean(text[match.end():end])
    if set(sections) != set(range(17, 247)):
        raise RuntimeError("The PDF must expose every numbered section from 17 through 246")
    return sections


def strip_lineage(text: str) -> str:
    text = re.sub(r"^.{0,100}?est (?:le |l')?(?:\w+|\d+(?:er|e|ème|nd))[^.]*\.\s*", "", text, flags=re.I)
    return re.sub(r"^[A-ZÀ-Ÿ '\-]+\s+dit\s*:?\s*", "", text)


def source_parts(text: str) -> tuple[str, str]:
    text = strip_lineage(text)
    if "«" in text and "»" in text:
        start, end = text.find("«"), text.rfind("»")
        return clean(text[start + 1:end]), clean(text[end + 1:])
    marker = re.search(r"\b(?:Celui|Celle|Cette personne|Ce signe|Toute personne)\b", text, flags=re.I)
    return (clean(text[:marker.start()]), clean(text[marker.start():])) if marker else (clean(text), "")


def matching_motifs(text: str) -> list[tuple[str, str, str, str]]:
    found = []
    for pattern, key, profile, title, sense in MOTIFS:
        if re.search(pattern, text, flags=re.I):
            found.append((key, profile, title, sense))
    return found[:6] or [("prudence",
        "Le signe demande une conduite réfléchie : le porteur doit mesurer les conséquences de ses choix et rester fidèle à ses engagements.",
        "La prudence précède l'accomplissement", "Une décision mûrie protège davantage qu'une réaction immédiate." )]


def named_figures(teaching: str, sign_name: str) -> list[str]:
    candidates = re.findall(r"\b[A-ZÀ-Ÿ][A-ZÀ-Ÿ0-9'-]{2,}\b", teaching)
    ignored = {"VODOUN", "NB", "DAN", "FA", "FÂ", *sign_name.split()}
    result = []
    for item in candidates:
        item = item.title()
        if item.upper() not in ignored and item not in result:
            result.append(item)
    return result[:4]


def narrative_frame(teaching: str, sign_name: str) -> str:
    figures = named_figures(teaching, sign_name)
    images = [label for pattern, label in IMAGE_TERMS if re.search(pattern, teaching, flags=re.I)][:4]
    events = [label for pattern, label in EVENTS if re.search(pattern, teaching, flags=re.I)][:3]
    parts = []
    if figures:
        names = figures[0] if len(figures) == 1 else ", ".join(figures[:-1]) + " et " + figures[-1]
        parts.append(f"Les protagonistes nommés sont {names}.")
    if images:
        image_text = images[0] if len(images) == 1 else ", ".join(images[:-1]) + " et " + images[-1]
        parts.append(f"Les images centrales du récit sont {image_text}.")
    if events:
        event_text = events[0] if len(events) == 1 else ", ".join(events[:-1]) + " puis " + events[-1]
        parts.append(f"Son déroulement met en jeu {event_text}.")
    if not parts:
        parts.append("L'enseignement part d'une situation ordinaire et en révèle les conséquences morales et spirituelles.")
    return " ".join(parts)


MISSING_SPECS = {
    "signe-103-winlin-tula": {
        "themes": "destinée, maîtrise de soi, autorité et service de la communauté",
        "divinites": "Fa, Ori, Lègba, Hêviosso, Gu et Lissa",
        "profil": [
            "Ce signe relie le changement propre à Winlin à la recherche d'orientation portée par Tula. Il annonce une capacité à guider, à prendre des responsabilités et à ouvrir une voie utile au groupe.",
            "La réussite dépend toutefois de la sobriété, de la fidélité dans le couple et de la maîtrise des réactions excessives. Une dette ou un différend financier ne doit jamais être réglé par la contrainte.",
            "Le porteur est invité à servir sa destinée avec constance, à protéger ses proches et à exercer son influence dans un esprit d'équité.",
        ],
        "devises": [
            ("La destinée s'affermit par la maîtrise de soi", "L'élévation annoncée demande une conduite stable, sobre et fidèle aux engagements pris."),
            ("L'autorité protège avant de commander", "Le responsable gagne le respect en servant la communauté et en préservant les plus vulnérables."),
            ("Une dette ne se règle pas par la force", "La contrainte transforme un désaccord matériel en conflit durable ; le dialogue et la justice doivent primer."),
        ],
        "interdits": ["Consommer de l'alcool", "Commettre l'adultère", "Employer la force pour recouvrer une dette", "Agir sous l'effet d'une excitation excessive"],
        "prescriptions": ["Honorer Fa et Ori", "Respecter les obligations liées à Lègba, Hêviosso, Gu et Lissa", "Exercer toute responsabilité avec mesure et esprit de service"],
    },
    "signe-106-winlin-ka": {
        "themes": "gratitude, unité familiale, juste usage des biens et retour des actes",
        "divinites": "Fa, Lègba et Hêviosso",
        "profil": [
            "Winlin Ka enseigne que le bien comme le mal peuvent entrer par la même porte. Le porteur doit donc rester attentif aux influences qu'il accueille dans sa maison et dans ses décisions.",
            "Le signe met en garde contre l'ingratitude, l'avarice et l'infidélité. Il rappelle aussi que le tort infligé à autrui finit par revenir vers son auteur.",
            "L'unité des frères et sœurs, l'hospitalité raisonnable et le respect des parents sont présentés comme des appuis essentiels pour recevoir et conserver la prospérité.",
        ],
        "devises": [
            ("La porte accueille le favorable comme le nuisible", "Le discernement doit accompagner toute nouvelle relation, proposition ou promesse."),
            ("Le mal fait à autrui revient vers son auteur", "Chaque acte prépare une conséquence ; la prudence et la justice protègent mieux que la vengeance."),
            ("L'avarice retarde la fortune", "Un bien retenu sans mesure peut isoler son propriétaire et fermer les chemins de la prospérité."),
        ],
        "interdits": ["Céder à l'avarice", "Trahir son conjoint", "Faire du mal à une personne vulnérable", "Ignorer les conseils des parents"],
        "prescriptions": ["Préserver l'unité familiale", "Honorer Fa, Lègba et Hêviosso", "Partager avec mesure et accueillir les proches sans désorganiser le foyer"],
    },
    "signe-158-sa-abla": {
        "themes": "intelligence, maîtrise de la force, santé, gratitude et prospérité",
        "divinites": "Fa, les ancêtres et Yalodé",
        "profil": [
            "Sa Abla oppose la force immédiate à l'intelligence qui observe avant d'agir. Le signe annonce une possibilité de prospérité, à condition de stabiliser les décisions et d'accomplir les obligations indiquées.",
            "Il attire l'attention sur la santé physique et spirituelle. Un avertissement du corps, un conseil reçu ou une difficulté persistante ne doit pas être traité avec négligence.",
            "La gratitude, l'hospitalité et le travail honnête soutiennent l'équilibre du porteur. Les conflits sans nécessité et le mauvais traitement des visiteurs fragilisent au contraire sa position.",
        ],
        "devises": [
            ("L'intelligence doit conduire la force", "La stratégie et la patience obtiennent ce que l'impulsion risque de compromettre."),
            ("La prospérité a besoin de stabilité", "Une bénédiction se conserve par la discipline, la gratitude et l'accomplissement des obligations."),
            ("Le corps et l'esprit doivent être écoutés", "Prendre au sérieux les premiers avertissements permet de prévenir une épreuve plus lourde."),
        ],
        "interdits": ["Provoquer un conflit sans nécessité", "Négliger un avertissement concernant la santé", "Maltraiter un visiteur", "Agir avec ingratitude"],
        "prescriptions": ["Accomplir les sacrifices prescrits", "Honorer les ancêtres et Yalodé", "Privilégier l'intelligence, le travail honnête et la gratitude"],
    },
    "signe-198-lete-yekou": {
        "themes": "mémoire ancestrale, stabilité, prudence et prospérité durable",
        "divinites": "Fa, Ori et Kluvito",
        "profil": [
            "Lètè Yèku unit la persévérance de Lètè à la profondeur ancestrale de Yèku. Il invite le porteur à rechercher des bases solides avant de poursuivre une ambition matérielle.",
            "Les anciens, les défunts et l'histoire familiale constituent des repères. Une rupture avec cette mémoire peut créer instabilité, isolement ou perte de direction.",
            "La prospérité annoncée se construit lentement. Elle demande discipline, respect de la parole donnée et attention aux conséquences d'une décision prise dans le secret ou la précipitation.",
        ],
        "devises": [
            ("Les ancêtres gardent la clé des fondations", "La mémoire familiale aide à comprendre les épreuves présentes et à choisir une voie plus stable."),
            ("La fortune durable avance sans précipitation", "La patience, l'épargne et la constance protègent mieux qu'un gain rapide."),
            ("La parole tenue consolide la maison", "Un engagement respecté nourrit la confiance entre les générations et protège la réputation."),
        ],
        "interdits": ["Négliger les devoirs envers les défunts et les ancêtres", "Rechercher un gain rapide au détriment de la stabilité", "Rompre une promesse importante"],
        "prescriptions": ["Honorer Kluvito et entretenir la mémoire familiale", "Prendre soin de Ori et suivre les orientations de Fa", "Construire toute entreprise sur des engagements clairs et durables"],
    },
    "signe-251-fu-sa": {
        "themes": "intégrité, volonté, équilibre, parole et dépassement de l'adversité",
        "divinites": "Fa et Lissa",
        "profil": [
            "Fu Sa appelle à transformer la puissance personnelle en volonté disciplinée. Le signe annonce la capacité de surmonter l'adversité sans perdre l'équilibre intérieur.",
            "Il met en garde contre la vantardise, les promesses sans suite, la trahison et les relations qui utilisent l'intimité pour nuire. La parole juste doit rester conforme aux actes.",
            "La paix et l'intégrité ouvrent une voie plus sûre que la confrontation. Les obligations accomplies avec sérieux sont associées au retour de l'honneur et du respect.",
        ],
        "devises": [
            ("La volonté conduit au-delà de l'adversité", "La persévérance devient féconde lorsqu'elle reste guidée par une conduite juste."),
            ("Une promesse vide affaiblit la parole", "La confiance naît de l'accord entre ce qui est annoncé et ce qui est réellement accompli."),
            ("Le mal fait à une personne confiante revient", "La trahison détruit d'abord le lien dont dépendait la réussite commune."),
        ],
        "interdits": ["Trahir la confiance reçue", "Faire des promesses sans intention de les tenir", "Se vanter de manière excessive", "Céder aux relations qui compromettent l'intégrité"],
        "prescriptions": ["Accomplir les sacrifices prescrits", "Honorer Fa et Lissa", "Cultiver la paix, la fidélité et la maîtrise de la parole"],
    },
    "signe-252-fu-trukpin": {
        "themes": "fécondité, libération, patience et victoire sur les obstacles",
        "divinites": "Fa, Lègba et Ori",
        "profil": [
            "Fu Trukpin travaille la sortie d'une situation longue ou contraignante. Il relie l'accomplissement à la patience, à la fécondité et à la capacité de ne pas abandonner devant un retard.",
            "Le porteur peut traverser une période où ses efforts semblent enfermés ou invisibles. Le signe l'encourage à poursuivre une action ordonnée plutôt qu'à multiplier les décisions contradictoires.",
            "La prière, le sacrifice et le soutien de l'entourage sont associés à la délivrance, à la naissance d'un projet et au retour d'une situation favorable.",
        ],
        "devises": [
            ("Ce qui mûrit dans le silence finit par paraître", "Le retard n'est pas toujours un refus ; certaines réalisations demandent une préparation complète."),
            ("La patience ouvre la voie de la naissance", "Un projet ou une descendance se protège par la constance, le soin et l'accomplissement des obligations."),
            ("La libération suit l'effort ordonné", "La victoire devient possible lorsque les actions cessent de se contredire et convergent vers un même but."),
        ],
        "interdits": ["Abandonner une obligation importante avant son terme", "Multiplier des promesses contradictoires", "Forcer une situation qui demande encore de mûrir"],
        "prescriptions": ["Accomplir les offrandes prescrites", "Honorer Fa, Lègba et Ori", "Soutenir les projets liés à la naissance, à la famille et à la libération"],
    },
    "signe-253-fu-tula": {
        "themes": "destinée, parole, santé, continuité des offrandes et responsabilité",
        "divinites": "Fa, Ori et Lègba",
        "profil": [
            "Fu Tula associe l'accomplissement à une orientation claire de la destinée. Il demande de renforcer régulièrement ce qui a été commencé au lieu d'attendre qu'une difficulté oblige à agir.",
            "La parole peut aller plus vite que la pensée. Le porteur doit donc vérifier ses informations, tenir ses engagements et éviter de décider sous l'effet d'une inquiétude passagère.",
            "L'attention portée au corps, à l'alimentation et aux relations intimes participe à la protection. L'écoute de la famille et des personnes expérimentées aide à ne pas s'égarer.",
        ],
        "devises": [
            ("La parole ne doit pas devancer la pensée", "Vérifier avant d'affirmer protège la réputation et empêche une erreur de devenir publique."),
            ("La destinée se renforce par des actes continus", "Une obligation régulièrement entretenue soutient mieux le parcours qu'une action tardive menée dans l'urgence."),
            ("Le conseil des proches garde la route", "L'expérience familiale peut révéler un risque que l'ambition ou la peur empêchait de voir."),
        ],
        "interdits": ["Parler avant d'avoir vérifié les faits", "Négliger les avertissements concernant la santé", "Rompre une prescription suivie dans la durée"],
        "prescriptions": ["Entretenir régulièrement les offrandes prescrites", "Honorer Fa, Ori et Lègba", "Écouter les conseils fiables de la famille avant une décision majeure"],
    },
    "signe-254-fu-lete": {
        "themes": "prudence, spiritualité, santé, reconnaissance et réconciliation",
        "divinites": "Fa, Ori, Lissa et Kluvito",
        "profil": [
            "Fu Lètè met la prudence au service de l'accomplissement. Il rappelle que la dimension spirituelle et la conduite quotidienne ne peuvent être séparées.",
            "Le signe déconseille l'indiscrétion, la désobéissance et la recherche excessive de richesse. Il invite aussi à examiner une situation avant d'agir et à prendre au sérieux les troubles persistants de la santé.",
            "Le porteur gagne à entretenir des relations utiles avec la communauté, à rechercher la réconciliation lorsqu'un lien est rompu et à terminer soigneusement ce qu'il entreprend.",
        ],
        "devises": [
            ("S'informer d'abord, agir ensuite", "L'enquête patiente protège des erreurs produites par la rumeur, l'apparence ou l'indiscrétion."),
            ("L'âme donne au corps son orientation", "La vie intérieure soutient la dignité, la santé et la capacité de traverser une épreuve."),
            ("La prudence ouvre l'air de la longévité", "La modération dans les ambitions et les habitudes protège une réussite déjà acquise."),
        ],
        "interdits": ["Agir sur une information non vérifiée", "Révéler une confidence", "Poursuivre la richesse au détriment de la santé", "Désobéir à un avertissement important"],
        "prescriptions": ["Honorer Fa, Ori, Lissa et Kluvito", "Prendre en charge sans retard les troubles de santé persistants", "Rechercher la réconciliation et achever les obligations commencées"],
    },
    "signe-255-fu-tche": {
        "themes": "achèvement, dignité, patience, persévérance et nouveau départ",
        "divinites": "Fa et Ori",
        "profil": [
            "Fu Tchè porte un enseignement d'achèvement. Une étape doit être comprise, menée à son terme et libérée avant qu'un nouveau commencement puisse devenir solide.",
            "L'image de l'oiseau calme au milieu des turbulences invite à conserver dignité et maîtrise de soi. Les revers ne doivent conduire ni à l'abandon ni à une réaction désordonnée.",
            "Le porteur progresse par des actions délibérées, des sacrifices accomplis et un effort continu. Il doit aussi renoncer à l'alcool lorsque celui-ci affaiblit sa lucidité et sa constance.",
        ],
        "devises": [
            ("Achever prépare le nouveau commencement", "Une transition devient féconde lorsque les obligations anciennes sont réglées avec clarté."),
            ("La dignité demeure au milieu de la turbulence", "Le calme permet de protéger son jugement et de choisir une réponse proportionnée à l'épreuve."),
            ("La persévérance traverse le revers", "L'effort continu transforme une difficulté temporaire en apprentissage et en nouvelle possibilité."),
        ],
        "interdits": ["Consommer de l'alcool", "Abandonner une étape sans régler ses obligations", "Réagir dans la confusion ou la précipitation"],
        "prescriptions": ["Accomplir les sacrifices prescrits", "Honorer Fa et Ori", "Clore les engagements anciens avant d'ouvrir un nouveau cycle"],
    },
    "signe-256-fu-ka": {
        "themes": "respect, intégrité, prudence financière, humilité et protection du foyer",
        "divinites": "Fa, Lissa et Sakpata",
        "profil": [
            "Fu Ka met en scène le renversement des positions : une personne utile peut être exploitée ou privée de reconnaissance, avant que la vérité de son travail n'apparaisse.",
            "Le signe demande de respecter les aînés comme les plus jeunes, d'éviter les gains douteux et de ne pas prétendre maîtriser un savoir que l'on ne possède pas. L'orgueil et la tromperie affaiblissent la protection.",
            "La propreté du foyer, la fidélité aux règles morales et le soin accordé aux proches constituent une discipline quotidienne. L'humilité permet au porteur de recevoir l'aide annoncée sans répéter les erreurs passées.",
        ],
        "devises": [
            ("Le service oublié finit par révéler sa valeur", "Le manque de reconnaissance ne supprime pas la qualité d'une œuvre ; la constance prépare son rétablissement."),
            ("L'argent injuste porte son propre désordre", "Un gain obtenu sans éthique expose le foyer à des conséquences plus lourdes que son avantage immédiat."),
            ("Le savoir véritable reste humble", "Reconnaître ses limites protège des erreurs et permet de demander conseil à une personne compétente."),
        ],
        "interdits": ["Accepter un gain obtenu de manière douteuse", "Tromper une personne qui demande conseil", "Révéler un secret confié", "Mépriser les aînés ou les personnes vulnérables"],
        "prescriptions": ["Honorer Fa, Lissa et Sakpata", "Maintenir la maison et les objets rituels dans la propreté", "Agir avec humilité, intégrité et respect envers chaque génération"],
    },
}


def build_missing_document(sign: dict[str, object], spec: dict[str, object]) -> dict[str, object]:
    number, name, house = int(sign["numero"]), str(sign["nom"]), house_for(str(sign["nom"]))
    devises = [{"ordre": i, "titre": title, "sens": sense} for i, (title, sense) in enumerate(spec["devises"], 1)]
    return {
        "slug": sign["slug"], "nom": name, "ordre": None, "type": "signe_derive",
        "position": f"{number}e signe du catalogue ; {ordinal_descendant(number)} des 240 signes descendants",
        "sexeSymbolique": "Non précisé pour ce signe", "maison": f"Maison de {house} ; signe dérivé de cette lignée",
        "divinites": spec["divinites"], "feuilles": "Aucune feuille particulière n'est indiquée pour ce signe",
        "couleurs": "Aucune couleur particulière n'est indiquée pour ce signe.",
        "profil": [f"{name} appartient à la maison de {house}. Il occupe la {ordinal_descendant(number)} place parmi les 240 signes descendants.", *spec["profil"]],
        "devises": devises, "interdits": spec["interdits"], "prescriptions": spec["prescriptions"],
        "synthese": f"{name} développe des thèmes liés à {spec['themes']}. Le porteur doit respecter ses interdits, accomplir les obligations indiquées et conduire ses choix avec mesure afin de préserver son équilibre.",
    }


def deities(text: str) -> list[str]:
    padded = f" {fold(text)} "
    found = []
    for name, aliases in DEITY_ALIASES.items():
        if any(fold(alias) in padded for alias in aliases):
            found.append(name)
    return found


def extract_interdits(text: str) -> list[str]:
    relevant = " ".join(re.findall(r"[^.!?;]*(?:ne doit|ne jamais|interdit)[^.!?;]*", text, flags=re.I))
    found = [label for pattern, label in TABOO_OBJECTS if re.search(pattern, relevant, flags=re.I)]
    extras = [
        (r"ne doit pas pr[eê]ter[^.;]*argent", "Prêter de l'argent"),
        (r"ne doit pas rester[^.;]*[eé]tranger", "S'établir durablement à l'étranger"),
        (r"ne doit (?:jamais )?(?:pas )?avorter", "Provoquer un avortement"),
        (r"ne doit (?:jamais )?(?:pas )?(?:vite |trop )?s['’][eé]nerver", "Céder à la colère"),
        (r"ne doit pas (?:se )?marier[^.;]*teint clair", "Épouser une personne au teint clair"),
        (r"ne doit pas manger trop vite", "Manger avec précipitation en public"),
        (r"ne doit pas aller (?:à|a) la chasse", "Aller à la chasse"),
        (r"ne doit pas sortir[^.;]*nuit|ne doit jamais se tra[iî]ner[^.;]*nuit", "Errer seul pendant la nuit profonde"),
        (r"ne doit pas voler", "S'approprier le bien d'autrui"), (r"ne doit pas mentir", "Mentir"),
    ]
    found.extend(label for pattern, label in extras if re.search(pattern, relevant, flags=re.I))
    return list(dict.fromkeys(found)) or ["Écarter les comportements imprudents signalés par le signe"]


def prescriptions(text: str, deity_names: list[str], motifs: list[tuple[str, str, str, str]]) -> list[str]:
    result = []
    if re.search(r"sacrifice|offrande", text, flags=re.I):
        result.append("Accomplir avec sérieux les sacrifices et offrandes prescrits")
    result.extend(f"Honorer {name} et respecter les obligations qui lui sont liées" for name in deity_names)
    keys = {item[0] for item in motifs}
    if "famille" in keys or "aînés" in keys:
        result.append("Préserver le dialogue familial et prendre soin des parents et des aînés")
    if "parole" in keys:
        result.append("Garder les confidences et mesurer toute parole donnée")
    if "colère" in keys or "conflit" in keys:
        result.append("Différer les décisions prises sous l'effet de la colère et rechercher l'apaisement")
    if "santé" in keys or "maternité" in keys:
        result.append("Prendre au sérieux les avertissements concernant la santé et la protection de la vie")
    return list(dict.fromkeys(result))[:6] or ["Suivre les orientations du signe avec constance et agir avec prudence"]


def ordinal_descendant(number: int) -> str:
    rank = number - 16
    return "premier" if rank == 1 else "deuxième" if rank == 2 else f"{rank}e"


def house_for(name: str) -> str:
    return HOUSE_NAMES.get(name.split()[0].split("-")[0].upper(), name.split()[0].title())


def colors_for(raw: str) -> str:
    colors = [c for c in ("rouge", "noir", "blanc", "bleu", "jaune") if re.search(rf"(?:tenue|vêtement)[^.;]*{c}", raw, flags=re.I)]
    return ("Le port de vêtements " + " et ".join(colors) + " est déconseillé.") if colors else "Aucune couleur particulière n'est indiquée pour ce signe."


def build_document(sign: dict[str, object], raw: str) -> dict[str, object]:
    name, number = str(sign["nom"]), int(sign["numero"])
    teaching, guidance = source_parts(raw)
    motifs = matching_motifs(f"{teaching} {guidance}")
    deity_names = deities(guidance)
    house = house_for(name)
    story = narrative_frame(teaching, name) + " " + " ".join(item[1] for item in motifs[:3])
    guidance_text = " ".join(item[1] for item in motifs[3:5]) or "Le porteur est invité à relire chaque décision à la lumière de la prudence, de la responsabilité et du respect de ses obligations."
    interdits = extract_interdits(guidance)
    duties = prescriptions(guidance, deity_names, motifs)
    devises = [{"ordre": i, "titre": item[2], "sens": item[3]} for i, item in enumerate(motifs[:5], 1)]
    keys = [item[0] for item in motifs[:4]]
    theme_phrase = keys[0] if len(keys) == 1 else ", ".join(keys[:-1]) + " et " + keys[-1]
    return {
        "slug": sign["slug"], "nom": name, "ordre": None, "type": "signe_derive",
        "position": f"{number}e signe du catalogue ; {ordinal_descendant(number)} des 240 signes descendants",
        "sexeSymbolique": "Non précisé pour ce signe",
        "maison": f"Maison de {house} ; signe dérivé de cette lignée",
        "divinites": ", ".join(deity_names) if deity_names else "Aucune divinité particulière n'est indiquée pour ce signe",
        "feuilles": "Aucune feuille particulière n'est indiquée pour ce signe",
        "couleurs": colors_for(guidance),
        "profil": [
            f"{name} appartient à la maison de {house}. Il occupe la {ordinal_descendant(number)} place parmi les 240 signes descendants.",
            story,
            guidance_text,
            f"Son enseignement articule {theme_phrase}. Les interdits et prescriptions précisent la conduite à tenir pour préserver l'équilibre recherché.",
        ],
        "devises": devises, "interdits": interdits, "prescriptions": duties,
        "synthese": f"{name} réunit des enseignements liés à {theme_phrase}. Le porteur doit agir avec discernement, respecter les interdits associés au signe et accomplir ses obligations afin de favoriser protection, stabilité et accomplissement.",
    }


def longest_shared_run(source: str, output: str) -> int:
    source_words = re.findall(r"\w+", fold(source))
    output_text = " ".join(re.findall(r"\w+", fold(output)))
    longest = 0
    for start in range(len(source_words)):
        for length in range(longest + 1, min(20, len(source_words) - start) + 1):
            if " ".join(source_words[start:start + length]) in output_text:
                longest = length
            else:
                break
    return longest


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    corpus = json.loads(CORPUS.read_text(encoding="utf-8"))
    sections = extract_sections()
    source_signs = [s for s in catalog["signes"] if s["type"] == "autre" and s["source"] == "pdf"]
    if len(source_signs) != 230:
        raise RuntimeError(f"Expected 230 PDF-backed signs, got {len(source_signs)}")
    by_slug = {document["slug"]: document for document in corpus["signes"]}
    report = []
    for pdf_number, sign in zip(range(17, 247), source_signs, strict=True):
        if sign["slug"] in CURATED_SLUGS:
            continue
        document = build_document(sign, sections[pdf_number])
        by_slug[str(sign["slug"])] = document
        report.append({
            "slug": sign["slug"], "pdfNumber": pdf_number, "sourceCharacters": len(sections[pdf_number]),
            "profileParagraphs": len(document["profil"]), "devises": len(document["devises"]),
            "interdits": len(document["interdits"]), "prescriptions": len(document["prescriptions"]),
            "longestSharedWordRun": longest_shared_run(sections[pdf_number], json.dumps(document, ensure_ascii=False)),
        })
    for sign in catalog["signes"]:
        spec = MISSING_SPECS.get(str(sign["slug"]))
        if not spec:
            continue
        document = build_missing_document(sign, spec)
        by_slug[str(sign["slug"])] = document
        report.append({
            "slug": sign["slug"], "pdfNumber": None, "sourceCharacters": 0,
            "profileParagraphs": len(document["profil"]), "devises": len(document["devises"]),
            "interdits": len(document["interdits"]), "prescriptions": len(document["prescriptions"]),
            "longestSharedWordRun": 0, "basis": "comparative research; editorial review required",
        })
    ordered = list(corpus["signes"][:17])
    ordered.extend(by_slug[str(sign["slug"])] for sign in catalog["signes"][16:] if str(sign["slug"]) in by_slug)
    corpus["signes"] = ordered
    CORPUS.write_text(json.dumps(corpus, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(report)} derived dossiers; corpus now contains {len(ordered)} documents")


if __name__ == "__main__":
    main()
